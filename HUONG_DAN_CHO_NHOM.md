# 📚 Hướng Dẫn Hiểu Hệ Thống - Dành Cho Nhóm

## 🎯 Hệ Thống Làm Gì?

**Tóm tắt 1 câu:** Chụp ảnh logo crypto → AI nhận diện → Hiển thị giá + AI tư vấn

**Ví dụ thực tế:**
1. Bạn chụp ảnh có logo Bitcoin và Ethereum
2. Hệ thống tự động nhận ra: "Đây là BTC và ETH"
3. Hiển thị giá hiện tại: BTC $97,000 | ETH $3,500
4. AI tư vấn: "BTC có nên mua không?" → Trả lời chi tiết

---

## 🔄 Quy Trình Hoạt Động (5 Bước Đơn Giản)

```
📸 Bước 1: Upload ảnh
    ↓
🤖 Bước 2: AI nhận diện logo (YOLOv8)
    ↓
💰 Bước 3: Lấy giá từ CoinGecko
    ↓
📊 Bước 4: Hiển thị kết quả
    ↓
💬 Bước 5: Chatbot tư vấn
```

---

## 📖 Chi Tiết Từng Bước

### 📸 **BƯỚC 1: Upload Ảnh**

**Người dùng làm gì:**
- Chọn ảnh từ máy tính, HOẶC
- Bật camera chụp trực tiếp

**Hệ thống làm gì:**
```
1. Nhận file ảnh (JPG/PNG)
2. Kiểm tra ảnh hợp lệ
3. Chuyển sang bước 2
```

**Code đơn giản:**
```python
# Frontend gửi ảnh lên server
file = request.files['image']
```

---

### 🤖 **BƯỚC 2: AI Nhận Diện Logo (YOLOv8)**

**Hệ thống làm gì:**

#### 2.1. Chuẩn bị ảnh
```python
# Đọc ảnh
image = Image.open(file)

# Resize nếu ảnh quá lớn (để xử lý nhanh hơn)
if width > 1280:
    image = resize(image, 1280)
```

#### 2.2. Cho ảnh vào AI
```python
# YOLOv8 phân tích ảnh
results = model.detect(image)
```

**AI làm gì?**
- Quét toàn bộ ảnh
- Tìm các vùng có logo crypto
- Nhận diện: "Đây là BTC", "Đây là ETH"
- Cho điểm tin cậy: 92% chắc là BTC

#### 2.3. Kết quả
```python
[
    {'name': 'BTC', 'confidence': 92%, 'vị trí': [x, y, w, h]},
    {'name': 'ETH', 'confidence': 87%, 'vị trí': [x, y, w, h]}
]
```

**Giải thích đơn giản:**
> Giống như bạn nhìn ảnh và nói "Ồ, đây là logo Bitcoin!", AI cũng làm vậy nhưng tự động và nhanh hơn.

---

### 💰 **BƯỚC 3: Lấy Giá Từ CoinGecko**

**Hệ thống làm gì:**

#### 3.1. Gọi API CoinGecko
```python
# Gửi request lấy giá
response = requests.get(
    'https://api.coingecko.com/api/v3/coins/markets',
    params={'ids': 'bitcoin,ethereum'}
)
```

#### 3.2. Nhận dữ liệu
```json
{
    "bitcoin": {
        "price": 97000,
        "change_24h": +1.2%,
        "market_cap": 1.9T,
        "volume": 35B
    },
    "ethereum": {
        "price": 3500,
        "change_24h": -0.8%,
        ...
    }
}
```



### 📊 **BƯỚC 4: Hiển Thị Kết Quả**

**Hệ thống làm gì:**

#### 4.1. Vẽ khung quanh logo
```python
# Vẽ hình chữ nhật màu cam quanh logo BTC
cv2.rectangle(image, (x, y), (x+w, y+h), color='orange')

# Ghi chữ "BTC 92%"
cv2.putText(image, "BTC 92%", (x, y))
```

#### 4.2. Tạo card thông tin
```html
<div class="coin-card">
    <img src="bitcoin-logo.png">
    <h3>Bitcoin</h3>
    <p class="price">$97,000</p>
    <p class="change">+1.2% (24h)</p>
    <canvas id="chart"></canvas> <!-- Biểu đồ giá -->
</div>
```

#### 4.3. Vẽ biểu đồ
```javascript
// Dùng Chart.js vẽ đường giá 7 ngày
new Chart(canvas, {
    type: 'line',
    data: prices_7days
})
```

**Người dùng thấy gì:**
- ✅ Ảnh có khung màu quanh logo
- ✅ Card hiển thị: Tên coin, giá, % thay đổi
- ✅ Biểu đồ giá 7 ngày

---

### 💬 **BƯỚC 5: Chatbot Tư Vấn**

**Người dùng làm gì:**
- Click nút: "💰 Có nên mua không?"
- Hoặc: "📈 Phân tích xu hướng"

**Hệ thống làm gì:**

#### 5.1. Chuẩn bị dữ liệu
```python
data = {
    'coin': 'Bitcoin',
    'price': 97000,
    'change_24h': +1.2%,
    'question': 'Có nên mua không?'
}
```

#### 5.2. Gọi AI (2 cách)

**Cách 1: Gemini API (nếu có quota)**
```python
# Gửi lên Google Gemini
response = gemini.ask(
    f"Bitcoin giá $97,000, tăng 1.2%. Có nên mua không?"
)
# → AI trả lời như chuyên gia
```

**Cách 2: Rule-based (nếu API hết quota)**
```python
if 'mua' in question:
    if change > 3%:
        return "Đang tăng mạnh, cân nhắc chờ giảm..."
    elif change > 0:
        return "Tích cực, có thể mua dần..."
    else:
        return "Đang giảm, đừng vội mua..."
```

#### 5.3. Hiển thị câu trả lời
```
💬 Trả lời:
Với mức tăng 1.2%, Bitcoin đang tích cực nhưng chưa quá nóng. 
Market cap 1.9T cho thấy đây là coin lớn, rủi ro thấp hơn. 
Có thể DCA (mua dần) nếu tin vào dự án dài hạn. 
Lưu ý: Crypto rất biến động, chỉ đầu tư số tiền bạn sẵn sàng mất!
```

---

## 🏗️ Kiến Trúc Hệ Thống

### **Frontend (Giao diện người dùng)**
```
📁 frontend/
├── index.html      ← Giao diện chính
├── script.js       ← Logic xử lý (upload, hiển thị)
└── style.css       ← Màu sắc, bố cục
```

**Công nghệ:**
- HTML/CSS/JavaScript (cơ bản)
- Chart.js (vẽ biểu đồ)

### **Backend (Xử lý logic)**
```
📁 backend/
├── app.py          ← Server chính (Flask)
└── requirements.txt ← Thư viện cần cài
```

**Công nghệ:**
- Python + Flask (web server)
- YOLOv8 (AI nhận diện)
- OpenCV (xử lý ảnh)

### **Model AI**
```
📄 best.pt          ← Model YOLOv8 đã train
```

**Đã train với:**
- 4 classes: BTC, ETH, LINK, SOL
- ~1000 ảnh logo crypto

---

## 🔧 Cách Chạy Hệ Thống

### **Bước 1: Cài đặt**
```bash
# Vào thư mục backend
cd backend

# Cài thư viện Python
pip install -r requirements.txt
```

### **Bước 2: Chạy server**
```bash
python app.py
```

### **Bước 3: Mở trình duyệt**
```
http://localhost:5000
```

**Xong!** Hệ thống đã chạy.

---

## 📊 Luồng Dữ Liệu (Data Flow)

```
┌─────────────┐
│   Browser   │ ← Người dùng upload ảnh
└──────┬──────┘
       │ HTTP POST /detect
       ↓
┌─────────────┐
│   Flask     │ ← Nhận ảnh
│   Server    │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   YOLOv8    │ ← AI phân tích ảnh
│   Model     │
└──────┬──────┘
       │ Detections: [BTC, ETH]
       ↓
┌─────────────┐
│  CoinGecko  │ ← Lấy giá
│     API     │
└──────┬──────┘
       │ Prices: {BTC: $97k, ETH: $3.5k}
       ↓
┌─────────────┐
│   Flask     │ ← Gộp dữ liệu
│   Server    │
└──────┬──────┘
       │ JSON Response
       ↓
┌─────────────┐
│   Browser   │ ← Hiển thị kết quả
└─────────────┘
       │
       │ User click "Có nên mua?"
       ↓
┌─────────────┐
│   Chatbot    │ ← AI tư vấn
│              │
└──────┬──────┘
       │ Answer: "Bitcoin đang tích cực..."
       ↓
┌─────────────┐
│   Browser   │ ← Hiển thị câu trả lời
└─────────────┘
```

---

## 🎓 Kiến Thức Cần Biết

### **Cho Frontend Developer:**
- ✅ HTML/CSS cơ bản
- ✅ JavaScript (fetch API, DOM manipulation)
- ✅ Chart.js (vẽ biểu đồ)

### **Cho Backend Developer:**
- ✅ Python cơ bản
- ✅ Flask (web framework)
- ✅ REST API (GET/POST requests)

### **Cho AI/ML Developer:**
- ✅ YOLOv8 (object detection)
- ✅ OpenCV (xử lý ảnh)
- ✅ Model training (nếu cần train lại)

---

## 🐛 Debug & Troubleshooting

### **Lỗi thường gặp:**

#### 1. "Module not found"
```bash
# Giải pháp: Cài lại thư viện
pip install -r requirements.txt
```

#### 2. "Model not found: best.pt"
```bash
# Giải pháp: Đảm bảo file best.pt ở thư mục gốc
ls best.pt  # Phải thấy file này
```

#### 3. "API rate limit exceeded"
```
# Giải pháp: Đợi 1 phút hoặc dùng fallback data
# Hệ thống tự động dùng dữ liệu dự phòng
```

#### 4. "Camera không hoạt động"
```
# Giải pháp: 
# - Cho phép browser truy cập camera
# - Dùng HTTPS (không phải HTTP)
```

---

## 📝 Câu Hỏi Thường Gặp (FAQ)

### **Q1: Tại sao cần 2 AI?**
**A:** 
- AI #1 (YOLOv8): Nhận diện logo trong ảnh
- AI #2 (Gemini): Tư vấn bằng ngôn ngữ tự nhiên
- Mỗi AI làm 1 việc khác nhau!

### **Q2: Làm sao AI nhận diện được logo?**
**A:** 
- Đã train model với ~1000 ảnh logo crypto
- AI học cách nhận ra hình dạng, màu sắc đặc trưng
- Giống như bạn học nhận diện chữ cái khi còn nhỏ

### **Q3: Dữ liệu giá lấy từ đâu?**
**A:** 
- API CoinGecko (miễn phí)
- Cập nhật realtime
- Có cache 5 phút để tránh spam API

### **Q4: Chatbot thông minh thế nào?**
**A:** 
- Dùng Gemini (AI của Google) - rất thông minh
- Nếu hết quota → dùng rule-based (vẫn ok)
- Phân tích dựa trên giá, % thay đổi, market cap

### **Q5: Có thể thêm coin khác không?**
**A:** 
- Có! Cần train lại model YOLOv8
- Chuẩn bị ảnh logo coin mới (~200 ảnh)
- Train thêm vào model hiện tại

---

## 🚀 Mở Rộng Trong Tương Lai

### **Tính năng có thể thêm:**
1. ✨ Nhận diện nhiều coin hơn (10-20 coins)
2. 📱 App mobile (React Native)
3. 🔔 Cảnh báo giá (price alert)
4. 📊 Portfolio tracker (theo dõi danh mục)
5. 🌐 Multi-language (EN/VI/CN)

---

## 📚 Tài Liệu Tham Khảo

### **Cho người mới:**
- [YOLOv8 Documentation](https://docs.ultralytics.com/)
- [Flask Tutorial](https://flask.palletsprojects.com/)
- [Chart.js Guide](https://www.chartjs.org/docs/)

### **Cho người nâng cao:**
- `SYSTEM_ARCHITECTURE.md` - Kiến trúc chi tiết
- `AI_EXPLANATION.md` - Giải thích AI & F(X)

---

## 💡 Tips Cho Nhóm


### **Khi viết báo cáo:**
1. ✅ Vẽ sơ đồ luồng dữ liệu (như trên)
2. ✅ Giải thích F(X) cho mỗi AI
3. ✅ Chụp ảnh kết quả thực tế
4. ✅ Nêu rõ công nghệ sử dụng
