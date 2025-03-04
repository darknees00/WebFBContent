from datetime import datetime  
from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector
import smtplib
from email.mime.text import MIMEText
import re
import requests
import schedule
import time
from threading import Thread
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Global logs list to capture log messages for the frontend
logs = []

def log(message):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    full_message = f"[{timestamp}] {message}"
    logs.append(full_message)
    print(full_message)

# API endpoint to retrieve logs
@app.route('/api/logs', methods=['GET'])
def get_logs():
    return jsonify({"logs": logs})

# Database configuration
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "52.184.83.97"),
    "user": os.getenv("DB_USER", "nhoma"),
    "password": os.getenv("DB_PASSWORD", "123"),
    "database": os.getenv("DB_NAME", "warehouse_management"),
    "charset": "utf8mb4"
}

# Connection pool
connection_pool = mysql.connector.pooling.MySQLConnectionPool(
    pool_name="mypool",
    pool_size=5,
    **DB_CONFIG
)

# Facebook API config
APP_ID = os.getenv("FB_APP_ID")
APP_SECRET = os.getenv("FB_APP_SECRET")
FB_ACCESS_TOKEN = os.getenv("FB_ACCESS_TOKEN")
FB_GROUP_ID = os.getenv("FB_GROUP_ID")
FB_EXCHANGE_TOKEN_URL = f"https://graph.facebook.com/oauth/access_token?grant_type=fb_exchange_token&client_id={APP_ID}&client_secret={APP_SECRET}&fb_exchange_token={FB_ACCESS_TOKEN}"

# Email config
SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
EMAIL_SENDER = os.getenv("EMAIL_SENDER")
EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD")

# API Endpoints
@app.route('/api/keywords', methods=['GET'])
def get_keywords():
    try:
        conn = connection_pool.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT keyword FROM keywords")
        keywords = [row[0] for row in cursor.fetchall()]
        
        return jsonify({"keywords": keywords}), 200
    except Exception as e:
        log(f"Error in get_keywords: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/keywords', methods=['POST'])
def handle_keywords():
    try:
        keywords = request.json.get('keywords', [])
        if not keywords:
            return jsonify({"error": "No keywords provided"}), 400

        conn = connection_pool.get_connection()
        cursor = conn.cursor()

        new_count = 0
        for kw in keywords:
            kw_clean = kw.strip()
            if kw_clean:
                try:
                    cursor.execute(
                        "INSERT INTO keywords (keyword) VALUES (%s)",
                        (kw_clean,)
                    )
                    new_count += 1
                except mysql.connector.IntegrityError:
                    pass  # Ignore duplicate

        conn.commit()
        log(f"Processed {len(keywords)} keywords, added {new_count} new entries")
        return jsonify({
            "message": f"Successfully processed {len(keywords)} keywords",
            "new_keywords": new_count
        }), 200

    except Exception as e:
        log(f"Error in handle_keywords: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/keywords', methods=['DELETE'])
def delete_keyword():
    try:
        keyword = request.json.get('keyword')
        if not keyword:
            return jsonify({"error": "No keyword provided"}), 400
        
        conn = connection_pool.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM keywords WHERE keyword = %s", (keyword,))
        deleted_count = cursor.rowcount
        conn.commit()
        
        return jsonify({"message": "Keyword deleted", "deleted_count": deleted_count}), 200
    except Exception as e:
        log(f"Error in delete_keyword: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/emails', methods=['GET'])
def get_emails():
    try:
        conn = connection_pool.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT email FROM emails")
        emails = [row[0] for row in cursor.fetchall()]
        
        return jsonify({"emails": emails}), 200
    except Exception as e:
        log(f"Error in get_emails: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/emails', methods=['POST'])
def handle_emails():
    try:
        emails = request.json.get('emails', [])
        if not emails:
            return jsonify({"error": "No emails provided"}), 400

        conn = connection_pool.get_connection()
        cursor = conn.cursor()

        email_regex = r'^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$'
        valid_emails = []
        invalid_emails = []

        for email in emails:
            email_clean = email.strip()
            if re.match(email_regex, email_clean):
                try:
                    cursor.execute(
                        "INSERT INTO emails (email) VALUES (%s)",
                        (email_clean,)
                    )
                    valid_emails.append(email_clean)
                except mysql.connector.IntegrityError:
                    pass  # Ignore duplicate
            else:
                invalid_emails.append(email_clean)

        conn.commit()
        log(f"Processed emails. Valid: {len(valid_emails)}, Invalid: {len(invalid_emails)}")
        return jsonify({
            "message": f"Added {len(valid_emails)} valid emails",
            "invalid_emails": invalid_emails
        }), 200

    except Exception as e:
        log(f"Error in handle_emails: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/emails', methods=['DELETE'])
def delete_email():
    try:
        email = request.json.get('email')
        if not email:
            return jsonify({"error": "No email provided"}), 400
        
        conn = connection_pool.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM emails WHERE email = %s", (email,))
        deleted_count = cursor.rowcount
        conn.commit()
        
        return jsonify({"message": "Email deleted", "deleted_count": deleted_count}), 200
    except Exception as e:
        log(f"Error in delete_email: {str(e)}")
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

def check_keywords(content, keywords):
    if content:
        content_lower = content.lower()
        keywords_lower = [kw.lower() for kw in keywords]

        for keyword in keywords_lower:
            pattern = re.escape(keyword)
            if re.search(pattern, content_lower):
                return keyword

        hashtags = re.findall(r'#([^\s#]+)', content)
        hashtags_lower = [tag.lower() for tag in hashtags]

        for keyword in keywords_lower:
            if keyword in hashtags_lower:
                return keyword

    return None

def handle_matched_post(post_id, content, matched_keyword, cursor):
    try:
        conn = connection_pool.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT post_id FROM matched_posts WHERE post_id = %s", (post_id,))
        if cursor.fetchone() is None:
            sql = "INSERT INTO matched_posts (post_id, content, matched_keyword, sent_email) VALUES (%s, %s, %s, %s)"
            cursor.execute(sql, (post_id, content, matched_keyword, False))
            conn.commit()
            log(f"✅ Saved post {post_id} with keyword '{matched_keyword}' to the database")

    except Exception as e:
        log(f"🔥 Error in handle_matched_post: {str(e)}")
    
    finally:
        cursor.close()
        conn.close()

def send_email_notification(post_id, content, matched_keyword):
    try:
        conn = connection_pool.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT sent_email FROM matched_posts WHERE post_id = %s", (post_id,))
        result = cursor.fetchone()

        # Nếu email đã được gửi trước đó, bỏ qua
        if result and result[0]:
            log(f"📧 Email already sent for post {post_id}, skipping notification")
            return

        cursor.execute("SELECT email FROM emails")
        receivers = [row[0] for row in cursor.fetchall()]
        if not receivers:
            log("⚠️ No emails found in the database for sending notifications")
            return

        # Đánh dấu đã gửi email trước khi gửi thực tế (giúp tránh trùng lặp nếu có nhiều process chạy song song)
        cursor.execute("UPDATE matched_posts SET sent_email = TRUE WHERE post_id = %s", (post_id,))
        conn.commit()

        log(f"📧 Sending email notification to {len(receivers)} recipients")

        msg = MIMEText(
            f"""
            📌 Post ID: {post_id}\n📝 Content: \n{content}\n🔗 Link: https://www.facebook.com/{post_id}
            """,
        )

        msg['Subject'] = f'🚨 New Post Notification - {matched_keyword}'
        msg['From'] = EMAIL_SENDER
        msg['To'] = ", ".join(receivers)

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(EMAIL_SENDER, EMAIL_PASSWORD)
            server.sendmail(EMAIL_SENDER, receivers, msg.as_string())
            log("✅ Email sent successfully")

    except smtplib.SMTPAuthenticationError:
        log("🔐 SMTP Authentication Error: Invalid email credentials")
    except smtplib.SMTPException as e:
        log(f"📧 SMTP Error: {str(e)}")
    except Exception as e:
        log(f"🔥 Unknown error during email sending: {str(e)}")
    finally:
        cursor.close()
        conn.close()

def process_posts(posts):
    try:
        conn = connection_pool.get_connection()
        cursor = conn.cursor()

        cursor.execute("SELECT keyword FROM keywords")
        keywords = [row[0] for row in cursor.fetchall()]
        log(f"🔑 Using {len(keywords)} keywords for scanning")

        for post in posts:
            post_id = post.get('id')
            content = post.get('message')
            created_time = post.get('created_time')

            log(f"📝 Post {post_id}")
            log(f"🕒 Time: {created_time}")
            log(f"📄 Content: {content[:50]}...")

            try:
                cursor.execute(
                    "INSERT IGNORE INTO posts (post_id, content, created_time) VALUES (%s, %s, %s)",
                    (post_id, content, datetime.now())
                )
                conn.commit()
            except Exception as e:
                log(f"📦 Error saving post: {str(e)}")

            matched_keyword = check_keywords(content, keywords)
            if matched_keyword:
                log(f"🎯 Detected keyword: {matched_keyword}")
                handle_matched_post(post_id, content, matched_keyword, cursor)
                send_email_notification(post_id, content, matched_keyword)
            else:
                log("🔍 No matching keyword found")

        conn.commit()

    except Exception as e:
        log(f"🔥 Error processing posts: {str(e)}")
    finally:
        cursor.close()
        conn.close()

# Facebook processing functions
def fetch_facebook_posts():
    try:
        log(f"🔎 Start scanning posts from Facebook Groups {FB_GROUP_ID}")
        
        url = f"https://graph.facebook.com/v22.0/{FB_GROUP_ID}/feed"
        params = {
            'access_token': FB_ACCESS_TOKEN,
            'limit': 10,
            #'fields': 'id,message,created_time'
        }

        response = requests.get(url, params=params)
        log(f"📡 Facebook API Response Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            posts = data.get('data', [])
            log(f"📥 Received {len(posts)} posts")
            process_posts(posts)
        else:
            log(f"❌ Facebook API error: {response.text}")

    except Exception as e:
        log(f"🔥 Critical error in fetch_facebook_posts: {str(e)}")


# Initial fetch for testing; you can remove this if you rely solely on the scheduler.
fetch_facebook_posts()

# Scheduler
def run_scheduler():
    schedule.every(1).minutes.do(fetch_facebook_posts)
    while True:
        schedule.run_pending()
        time.sleep(1)

if __name__ == '__main__':
    scheduler_thread = Thread(target=run_scheduler)
    scheduler_thread.daemon = True
    scheduler_thread.start()
    app.run(host='0.0.0.0', port=8084, debug=True)
