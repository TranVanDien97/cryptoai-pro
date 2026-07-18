# 📈 CryptoAI Pro — AI Trading Assistant with Binance Integration

> Ứng dụng giao dịch tiền điện tử thông minh, tích hợp Binance API để quản lý tài khoản và giao dịch, cùng với Gemini AI để phân tích kỹ thuật và hỗ trợ ra quyết định.

## 🚀 Tính năng chính

*   **Quản lý Binance:** Kết nối an toàn với tài khoản Binance của bạn để xem số dư, lệnh mở, lịch sử giao dịch và đặt lệnh mua/bán.
*   **Phân tích kỹ thuật AI:** Sử dụng Gemini AI để phân tích dữ liệu thị trường theo thời gian thực, đưa ra các tín hiệu mua/bán dựa trên các chỉ báo kỹ thuật (RSI, MACD, Bollinger Bands, EMA, SMA) trên nhiều khung thời gian (1H, 4H, 1D).
*   **Hệ thống cảnh báo thông minh:** Thiết lập các cảnh báo giá tùy chỉnh, Stop-Loss, Take-Profit, Trailing Stop-Loss và cảnh báo biến động thị trường.
*   **Trò chuyện với AI:** Tương tác với Gemini AI để nhận tư vấn về danh mục đầu tư và phân tích thị trường.
*   **Giao diện thân thiện:** Giao diện người dùng trực quan, dễ sử dụng, được tối ưu hóa cho trải nghiệm giao dịch.

## 🏗️ Kiến trúc

Ứng dụng bao gồm hai phần chính:

*   **Backend (Node.js/Express):** Hoạt động như một proxy an toàn cho Binance API, xử lý việc ký yêu cầu (HMAC SHA256) và quản lý CORS. Đồng thời, nó tích hợp với Gemini AI để xử lý các yêu cầu phân tích và trò chuyện.
*   **Frontend (HTML/CSS/JavaScript thuần):** Cung cấp giao diện người dùng tương tác, hiển thị dữ liệu thị trường, tín hiệu AI, thông tin tài khoản Binance và cho phép người dùng thực hiện các hành động giao dịch.

## 🛠️ Cài đặt và Chạy ứng dụng

### Yêu cầu

*   **Node.js 18+**
*   **API Key của Binance:** Để kết nối với sàn giao dịch Binance.
*   **API Key của Gemini AI:** Để sử dụng các tính năng phân tích và trò chuyện AI.

### Hướng dẫn

1.  **Clone kho lưu trữ:**
    ```bash
    git clone https://github.com/TranVanDien97/cryptoai-pro.git
    cd cryptoai-pro
    ```

2.  **Cài đặt dependencies cho Backend:**
    ```bash
    cd server
    npm install
    cd ..
    ```

3.  **Cấu hình API Keys:**
    *   Tạo tệp `.env` trong thư mục `server` với nội dung sau (thay thế bằng API Key và Secret của bạn):
        ```
        BINANCE_API_KEY=YOUR_BINANCE_API_KEY
        BINANCE_API_SECRET=YOUR_BINANCE_API_SECRET
        GEMINI_API_KEY=YOUR_GEMINI_API_KEY
        ```
    *   Hoặc bạn có thể nhập trực tiếp trong giao diện ứng dụng sau khi khởi chạy.

4.  **Khởi chạy Backend:**
    ```bash
    npm start
    ```
    (Server sẽ chạy trên cổng 8001 theo mặc định)

5.  **Truy cập Frontend:**
    Mở trình duyệt và truy cập `http://localhost:8001`.

## ⚠️ Disclaimer

CryptoAI Pro chỉ cung cấp thông tin tham khảo và công cụ hỗ trợ giao dịch, không phải tư vấn đầu tư chuyên nghiệp. Thị trường tiền điện tử có rủi ro cao và biến động mạnh. Mọi quyết định đầu tư là trách nhiệm của người dùng. Hãy luôn nghiên cứu kỹ lưỡng và quản lý rủi ro cẩn thận.

## 📝 License

MIT
