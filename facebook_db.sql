CREATE SCHEMA facebook_db;

USE facebook_db;

CREATE TABLE posts (
    post_id VARCHAR(255) PRIMARY KEY,
    content TEXT,
    created_time DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE keywords (
    id INT AUTO_INCREMENT PRIMARY KEY,
    keyword VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE matched_posts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    post_id VARCHAR(255) UNIQUE,
    content TEXT,
    matched_keyword VARCHAR(255),
    sent_email BOOLEAN DEFAULT FALSE
);

CREATE TABLE emails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_time DATETIME DEFAULT CURRENT_TIMESTAMP
);