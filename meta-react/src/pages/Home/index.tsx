import { useEffect, useState, KeyboardEvent } from "react";

const HomePage = () => {
  // Quản lý keyword
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInputValue, setKeywordInputValue] = useState("");

  // Quản lý email
  const [emails, setEmails] = useState<string[]>([]);
  const [emailInputValue, setEmailInputValue] = useState("");

  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState<string[]>([]);

  // Lấy logs từ API
  const fetchLogs = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8085/api/logs");
      const data = await response.json();
      setLogs(data.logs);
    } catch (error) {
      console.error("獲取系統日誌時出錯：", error);
    }
  };

  // Lấy danh sách keyword từ API
  const fetchDbKeywords = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8085/api/keywords");
      const data = await response.json();
      if (data.keywords && Array.isArray(data.keywords)) {
        setKeywords(data.keywords);
      }
    } catch (error) {
      console.error("獲取資料庫關鍵字時出錯：", error);
    }
  };

  // Lấy danh sách email từ API
  const fetchDbEmails = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8085/api/emails");
      const data = await response.json();
      if (data.emails && Array.isArray(data.emails)) {
        setEmails(data.emails);
      }
    } catch (error) {
      console.error("獲取資料庫電子郵件時出錯：", error);
    }
  };

  // Khi component mount: tải keyword, email và logs
  useEffect(() => {
    fetchDbKeywords();
    fetchDbEmails();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  // --------------------------
  // Xử lý khi nhấn Enter để nhận dữ liệu từ 2 ô input
  // --------------------------
  const handleEnterSubmit = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();

      // Lấy giá trị đã cắt khoảng trắng
      const trimmedKeyword = keywordInputValue.trim();
      const trimmedEmail = emailInputValue.trim();

      // Tạo bản sao mảng hiện có để cập nhật
      let updatedKeywords = [...keywords];
      let updatedEmails = [...emails];

      // Nếu có dữ liệu trong ô keyword và chưa tồn tại thì thêm vào mảng
      if (trimmedKeyword && !keywords.includes(trimmedKeyword)) {
        updatedKeywords.push(trimmedKeyword);
      }
      // Nếu có dữ liệu trong ô email và chưa tồn tại thì thêm vào mảng
      if (trimmedEmail && !emails.includes(trimmedEmail)) {
        updatedEmails.push(trimmedEmail);
      }

      // Cập nhật state và reset giá trị input
      setKeywords(updatedKeywords);
      setEmails(updatedEmails);
      setKeywordInputValue("");
      setEmailInputValue("");
    }
  };

  // --------------------------
  // Gửi dữ liệu keyword và email tới backend
  // --------------------------
  const handleSubmit = async (
    submittedKeywords?: string[],
    submittedEmails?: string[]
  ) => {
    const finalKeywords = submittedKeywords ?? keywords;
    const finalEmails = submittedEmails ?? emails;

    if (finalKeywords.length === 0 && finalEmails.length === 0) {
      setMessage("請至少輸入一個關鍵字或電子郵件！");
      return;
    }

    try {
      const requests = [];

      if (finalKeywords.length > 0) {
        requests.push(
          fetch("http://127.0.0.1:8085/api/keywords", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keywords: finalKeywords }),
          })
        );
      }

      if (finalEmails.length > 0) {
        requests.push(
          fetch("http://127.0.0.1:8085/api/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emails: finalEmails }),
          })
        );
      }

      const responses = await Promise.all(requests);
      const results = await Promise.all(responses.map((r) => r.json()));

      const keywordResult = results.find((r) =>
        r.message?.includes("keywords")
      );
      const emailResult = results.find((r) => r.message?.includes("emails"));

      let successMessage = "✅ 成功：";
      if (keywordResult)
        successMessage += `${keywordResult.new_keywords || 0} 個關鍵字, `;
      if (emailResult)
        successMessage += `${emailResult.message?.match(/\d+/)[0] || 0} 封電子郵件`;

      if (emailResult?.invalid_emails?.length > 0) {
        successMessage += ` （無效電子郵件：${emailResult.invalid_emails.join(
          ", "
        )}）`;
      }

      setMessage(successMessage);
      // Sau khi gửi, cập nhật lại dữ liệu từ DB
      fetchDbKeywords();
      fetchDbEmails();
    } catch (error) {
      console.error("發送資料時出錯：", error);
      let errorMessage = "未知錯誤";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }
      setMessage(`❌ 發送資料時出錯：${errorMessage}`);
    }
  };

  // --------------------------
  // Xóa keyword với xác nhận dialog và xóa trong database
  // --------------------------
  const handleDeleteKeyword = async (keywordToDelete: string) => {
    const confirmed = window.confirm(
      `您確定要刪除關鍵字「${keywordToDelete}」嗎？`
    );
    if (confirmed) {
      try {
        const response = await fetch("http://127.0.0.1:8085/api/keywords", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ keyword: keywordToDelete }),
        });
        if (response.ok) {
          setKeywords((prev) =>
            prev.filter((keyword) => keyword !== keywordToDelete)
          );
          setMessage(`已成功刪除關鍵字「${keywordToDelete}」。`);
        } else {
          console.error("無法從資料庫中刪除關鍵字");
          setMessage("❌ 無法從資料庫中刪除關鍵字。");
        }
      } catch (error) {
        console.error("刪除關鍵字時出錯:", error);
        setMessage("❌ 刪除關鍵字時出錯。");
      }
    }
  };

  // --------------------------
  // Xóa email với xác nhận dialog và xóa trong database
  // --------------------------
  const handleDeleteEmail = async (emailToDelete: string) => {
    const confirmed = window.confirm(
      `您確定要刪除電子郵件「${emailToDelete}」嗎？`
    );
    if (confirmed) {
      try {
        const response = await fetch("http://127.0.0.1:8085/api/emails", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailToDelete }),
        });
        if (response.ok) {
          setEmails((prev) =>
            prev.filter((email) => email !== emailToDelete)
          );
          setMessage(`已成功刪除電子郵件「${emailToDelete}」。`);
        } else {
          console.error("無法從資料庫中刪除電子郵件");
          setMessage("❌ 無法從資料庫中刪除電子郵件。");
        }
      } catch (error) {
        console.error("刪除電子郵件時出錯:", error);
        setMessage("❌ 刪除電子郵件時出錯。");
      }
    }
  };


  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        <div className="flex flex-1 p-4">
          <div className="w-full max-w-2xl mx-auto">
            {/* Phần nhập keyword */}
            <div className="mb-8">
              <h1 className="text-xl font-bold mb-3 text-gray-700">
                輸入關鍵字 (垂直排列)
              </h1>
              <div className="mb-4">
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="請輸入關鍵字後按 Enter"
                  value={keywordInputValue}
                  onChange={(e) => setKeywordInputValue(e.target.value)}
                  onKeyUp={handleEnterSubmit}
                />
              </div>
              <ul className="space-y-2">
                {keywords.map((keyword, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between border border-gray-200 rounded p-2"
                  >
                    <span>{keyword}</span>
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteKeyword(keyword)}
                    >
                      刪除
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex justify-end mt-2">
              </div>
            </div>

            {/* Phần nhập email */}
            <div className="mb-8">
              <h1 className="text-xl font-bold mb-3 text-gray-700">
                輸入電子郵件 (垂直排列)
              </h1>
              <div className="mb-4">
                <input
                  type="text"
                  className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="請輸入電子郵件後按 Enter"
                  value={emailInputValue}
                  onChange={(e) => setEmailInputValue(e.target.value)}
                  onKeyUp={handleEnterSubmit}
                />
              </div>
              <ul className="space-y-2">
                {emails.map((email, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between border border-gray-200 rounded p-2"
                  >
                    <span>{email}</span>
                    <button
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDeleteEmail(email)}
                    >
                      刪除
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex justify-end mt-2">
              </div>
            </div>

            {/* Nút gửi dữ liệu */}
            <div className="flex justify-center space-x-4">
              <button
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium text-lg"
                onClick={() => handleSubmit()}
              >
                儲存資料並開始掃描
              </button>
            </div>

            {/* Hiển thị thông báo */}
            {message && (
              <div className="mt-6 p-3 text-center text-lg font-semibold">
                {message.startsWith("✅") ? (
                  <div className="text-green-600 space-y-2">
                    <span>{message}</span>
                    <p className="text-sm text-gray-600 mt-2">
                      系統將自動每 10 分鐘掃描新文章
                    </p>
                  </div>
                ) : (
                  <span className="text-red-600">{message}</span>
                )}
              </div>
            )}

            {/* Phần hiển thị logs của hệ thống */}
            <div className="mt-8">
              <h2 className="text-xl font-bold mb-3 text-gray-700">系統日誌</h2>
              <div className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                <pre className="whitespace-pre-wrap font-mono text-sm overflow-auto max-h-96">
                  {logs.join("\n")}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
