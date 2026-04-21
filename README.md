# 🪙 Crypto Logo Detection System

Hệ thống phát hiện logo tiền điện tử sử dụng AI (YOLOv8) kết hợp với dữ liệu thị trường realtime và chatbot tư vấn.

## 📥 Cài Đặt

### Bước 1: Clone Repository

```bash
# Clone project từ GitHub
git clone https://github.com/your-username/crypto-detection.git

# Di chuyển vào thư mục project
cd crypto-detection
```

### Bước 2: Tạo Virtual Environment (Khuyến nghị)

**Windows:**
```bash
# Tạo virtual environment
python -m venv .venv

# Kích hoạt
.venv\Scripts\activate
```

**macOS/Linux:**
```bash
# Tạo virtual environment
python3 -m venv .venv

# Kích hoạt
source .venv/bin/activate
```

### Bước 3: Cài Đặt Dependencies

```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt các thư viện cần thiết
pip install -r requirements.txt
```

**Nếu gặp lỗi, thử:**
```bash
pip install --upgrade pip
pip install -r requirements.txt
```


### Cấu trúc phải như sau:
```
crypto-detection/
├── best.pt          ← File model ở đây
├── backend/
├── frontend/
└── README.md
```

**Kiểm tra:**
```bash
# Quay về thư mục gốc
cd ..

# Kiểm tra file tồn tại
ls best.pt          # macOS/Linux
dir best.pt         # Windows
```

## 🚀 Chạy Ứng Dụng

### Bước 1: Start Backend Server

```bash
# Đảm bảo đang ở thư mục backend
cd backend

# Chạy Flask server
python app.py
```

**Kết quả mong đợi:**
```
 * Running on http://127.0.0.1:5000
 * Debug mode: on
```

### Bước 2: Mở Trình Duyệt

Truy cập: **http://localhost:5000**

### Bước 3: Sử Dụng

1. **Upload ảnh** hoặc **bật camera**
2. Click **"🔍 Detect Coins"**
3. Xem kết quả: Logo được nhận diện + Giá realtime
4. Click nút chatbot để hỏi AI

---

## 📁 Cấu Trúc Project

```
crypto-detection/
│
├── backend/                  
│   ├── app.py                
│   └── requirements.txt      
│
├── frontend/                  
│   ├── index.html             
│   ├── script.js             
│   └── style.css              
│
├── best.pt                     # YOLOv8 model
│
├── .gitignore                 
```

---

## 🛠️ Công Nghệ Sử Dụng

### Backend
- **Flask** - Web framework
- **YOLOv8** (Ultralytics) - Object detection
- **OpenCV** - Image processing
- **Pillow** - Image manipulation
- **Requests** - HTTP client

### Frontend
- **HTML5/CSS3** - Structure & styling
- **JavaScript (ES6+)** - Logic
- **Chart.js** - Data visualization

### AI/ML
- **YOLOv8** - Logo detection
- **Gemini 2.5 Flash** - Chatbot (optional)

### APIs
- **CoinGecko API** - Cryptocurrency market data

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


