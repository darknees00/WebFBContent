import { useEffect, useState } from "react";

const HomePage = () => {
  const [keywordInput, setKeywordInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [message, setMessage] = useState("");
  const [logs, setLogs] = useState<string[]>([]);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Hàm lấy logs từ API
  const fetchLogs = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/logs");
      const data = await response.json();
      setLogs(data.logs);
    } catch (error) {
      console.error("取得日誌時出錯:", error);
    }
  };

  // Bắt đầu polling khi component mount
  useEffect(() => {
    const interval = setInterval(fetchLogs, 2000); // Cập nhật logs mỗi 2 giây
    setPollingInterval(interval);

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [pollingInterval]);

  const handleSubmit = async () => {
    // Chuẩn bị dữ liệu
    const keywords = keywordInput
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    const emails = emailInput
      .split('\n')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    // Validate đầu vào
    if (keywords.length === 0 && emails.length === 0) {
      setMessage("請輸入至少一個關鍵字或電子郵件！");
      return;
    }

    try {
      // Gửi dữ liệu theo batch
      const requests = [];
      const interval = setInterval(fetchLogs, 2000);
      setPollingInterval(interval);
      if (keywords.length > 0) {
        requests.push(
          fetch("http://localhost:5000/api/keywords", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ keywords })
          })
        );
      }

      if (emails.length > 0) {
        requests.push(
          fetch("http://localhost:5000/api/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ emails })
          })
        );
      }

      // Xử lý tất cả requests
      const responses = await Promise.all(requests);
      const results = await Promise.all(responses.map(r => r.json()));

      // Tổng hợp kết quả
      const keywordResult = results.find(r => r.message?.includes("keywords"));
      const emailResult = results.find(r => r.message?.includes("emails"));

      let successMessage = "✅ 成功： ";
      if (keywordResult) successMessage += `${keywordResult.new_keywords || 0} keywords, `;
      if (emailResult) successMessage += `${emailResult.message?.match(/\d+/)[0] || 0} emails`;

      if (emailResult?.invalid_emails?.length > 0) {
        successMessage += ` (電子郵件無效： ${emailResult.invalid_emails.join(', ')})`;
      }

      setMessage(successMessage);
      setKeywordInput("");
      setEmailInput("");

    } catch (error) {
      console.error("Error:", error);

      let errorMessage = "Unknown error";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      }

      setMessage(`❌ Error sending data: ${errorMessage}`);
      setKeywordInput("");
      setEmailInput("");
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
                輸入關鍵字（每行一個關鍵字）
              </h1>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例如:
新書上架
享讀時光
..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                rows={5}
              />
            </div>

            {/* Phần nhập email */}
            <div className="mb-8">
              <h1 className="text-xl font-bold mb-3 text-gray-700">
                輸入電子郵件（每行一封電子郵件）
              </h1>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="例如:
user1@example.com
user2@domain.com
..."
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                rows={5}
              />
            </div>

            {/* Nút submit */}
            <div className="flex justify-center">
              <button
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium text-lg"
                onClick={handleSubmit}
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
                    系統將每10分鐘自動掃描一次新貼文。
                    </p>
                  </div>
                ) : (
                  <span className="text-red-600">{message}</span>
                )}
              </div>
            )}
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