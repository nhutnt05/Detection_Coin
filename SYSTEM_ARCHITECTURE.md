# Kiến Trúc Hệ Thống Crypto Logo Detection

## Tổng Quan

Hệ thống phát hiện logo tiền điện tử sử dụng Deep Learning (YOLOv8) kết hợp với API dữ liệu thị trường và AI Chatbot để cung cấp phân tích toàn diện.

---

## Quy Trình Xử Lý (Input → Output)

### 1️⃣ **INPUT: Người dùng upload ảnh**

**Các nguồn input:**
- 📁 Upload file từ máy tính
- 📷 Camera realtime

**Format hỗ trợ:** JPG, PNG, WEBP

---

### 2️⃣ **PREPROCESSING: Tiền xử lý ảnh**

#### **Bước 2.1: Đọc và chuyển đổi ảnh**
```python
# Đọc ảnh từ bytes
pil_img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
```

**Thuật toán:** PIL Image Processing
- Chuyển đổi sang RGB color space
- Đảm bảo format chuẩn cho model

#### **Bước 2.2: Resize ảnh (nếu cần)**
```python
if max(w, h) > 1280:
    scale = 1280 / max(w, h)
    pil_img = pil_img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
```

**Thuật toán:** Lanczos Resampling
- **Mục đích:** Giảm kích thước ảnh lớn (4K+) để tăng tốc độ xử lý
- **Phương pháp:** Lanczos interpolation (chất lượng cao)
- **Threshold:** 1280px (chiều dài cạnh lớn nhất)

#### **Bước 2.3: Chuyển đổi color space**
```python
img_np = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
```

**Thuật toán:** Color Space Conversion
- RGB → BGR (format của OpenCV/YOLO)

---

### 3️⃣ **DETECTION: Phát hiện logo bằng YOLOv8**

#### **Thuật toán chính: YOLOv8 (You Only Look Once v8)**

```python
results = model(img_np, conf=0.15)[0]
```

**Kiến trúc YOLOv8:**

1. **Backbone: CSPDarknet**
   - Trích xuất features từ ảnh
   - Sử dụng Cross Stage Partial connections
   - Output: Feature maps ở nhiều scales

2. **Neck: PANet (Path Aggregation Network)**
   - Kết hợp features từ các layers khác nhau
   - Bottom-up + Top-down pathway
   - Tăng khả năng phát hiện objects ở nhiều kích thước

3. **Head: Decoupled Head**
   - Classification head: Dự đoán class (BTC, ETH, LINK, SOL)
   - Regression head: Dự đoán bounding box (x, y, w, h)

**Hyperparameters:**
- **Confidence threshold:** 0.15 (15%)
- **Classes:** 4 (BTC, ETH, LINK, SOL)
- **Input size:** Dynamic (tự động resize)

**Output của YOLO:**
```python
{
    'boxes': [
        {
            'class_id': 0,           # 0=BTC, 1=ETH, 2=LINK, 3=SOL
            'confidence': 0.92,      # 92% chắc chắn
            'bbox': [x1, y1, x2, y2] # Tọa độ bounding box
        }
    ]
}
```

#### **Bước 3.1: Lọc kết quả**
```python
if class_name not in COIN_ID_MAP:
    continue
```

**Thuật toán:** Rule-based Filtering
- Chỉ giữ lại 4 class hợp lệ
- Loại bỏ false positives

---

### 4️⃣ **POST-PROCESSING: Xử lý kết quả detection**

#### **Bước 4.1: Đếm số lượng coin**
```python
coin_counts = {}
for det in detections:
    coin_counts[det['coin_id']] = coin_counts.get(det['coin_id'], 0) + 1
```

**Thuật toán:** Frequency Counting
- Đếm số lần xuất hiện của mỗi coin
- Dùng cho tính toán portfolio value

#### **Bước 4.2: Loại bỏ duplicate (giữ confidence cao nhất)**
```python
seen = {}
for det in detections:
    cid = det['coin_id']
    if cid not in seen or det['confidence'] > seen[cid]['confidence']:
        seen[cid] = det
```

**Thuật toán:** Greedy Selection
- Với mỗi coin, chỉ giữ detection có confidence cao nhất
- Tránh hiển thị nhiều card cho cùng 1 coin

---

### 5️⃣ **DATA ENRICHMENT: Lấy dữ liệu thị trường**

#### **API: CoinGecko Markets API**
```python
resp = requests.get(
    f"{COINGECKO_BASE}/coins/markets",
    params={'vs_currency': 'usd', 'ids': ids_str}
)
```

**Dữ liệu lấy được:**
- `current_price`: Giá hiện tại (USD)
- `price_change_percentage_24h`: % thay đổi 24h
- `market_cap`: Vốn hóa thị trường
- `total_volume`: Khối lượng giao dịch 24h
- `image`: URL logo coin

### 6️⃣ **CHART DATA: Lấy dữ liệu biểu đồ**

#### **API: CoinGecko Market Chart**
```python
resp = requests.get(
    f"{COINGECKO_BASE}/coins/{coin_id}/market_chart",
    params={'vs_currency': 'usd', 'days': days}
)
```

**Dữ liệu:**
- Giá theo thời gian (timestamps + prices)
- 2 timeframes: 24h và 7 ngày

#### **Fallback: Synthetic Chart Generation**

**Thuật toán:** Random Walk với Brownian Motion
```python
def _generate_fallback_chart(coin_id: str, days: int):
    price = base_price * 0.95
    for i in range(points):
        price *= (1 + random.uniform(-0.015, 0.015))  # ±1.5% mỗi bước
        result.append([timestamp, price])
```

**Mô phỏng:**
- Biến động ngẫu nhiên ±1.5% mỗi điểm
- Tạo chart giả khi API fail

---

### 7️⃣ **VISUALIZATION: Vẽ bounding boxes**

#### **Thuật toán: OpenCV Drawing**
```python
cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
cv2.putText(img, text, (x1, y1), font, size, color, thickness)
```

**Các bước:**
1. Vẽ rectangle quanh logo
2. Vẽ background cho text
3. Vẽ text (tên coin + confidence)
4. Encode thành PNG base64

**Color mapping:**
- BTC: Orange `#FFA500`
- ETH: Blue `#6495ED`
- LINK: Blue `#0064FF`
- SOL: Purple `#9945FF`

---

### 8️⃣ **AI CHATBOT: Phân tích và tư vấn**

#### **Thuật toán: Hybrid AI System**


**Rule-based Fallback (khi API fail)**

**Thuật toán:** Keyword Matching + Conditional Logic
```python
if 'mua' in question or 'buy' in question:
    if change_val > 3:
        return "Đang tăng mạnh, cân nhắc chờ pullback..."
    elif change_val > 0:
        return "Tích cực nhưng chưa quá nóng, có thể DCA..."
```

**Logic tree:**
1. Phân tích từ khóa trong câu hỏi
2. Parse % thay đổi giá
3. Phân loại market cap (T/B/M)
4. Tạo response dựa trên rules

---

### 9️⃣ **OUTPUT: Trả về kết quả**

#### **JSON Response Structure**
```json
{
  "detections": [
    {
      "name": "btc",
      "coin_id": "bitcoin",
      "confidence": 0.92,
      "bbox": [100, 150, 300, 350],
      "count": 2,
      "price": 97000,
      "change_24h": 1.2,
      "market_cap": 1900000000000,
      "volume": 35000000000,
      "image_url": "https://...",
      "chart": {
        "24h": [[timestamp, price], ...],
        "7d": [[timestamp, price], ...]
      }
    }
  ],
  "total_value": 194000,
  "annotated_image": "base64_encoded_png",
  "coin_counts": {"bitcoin": 2}
}
```

---

## Thuật Toán Tổng Hợp

### 1. **Computer Vision**
- ✅ YOLOv8 (Object Detection)
- ✅ Lanczos Resampling (Image Resize)
- ✅ Color Space Conversion (RGB ↔ BGR)
- ✅ OpenCV Drawing (Visualization)

### 2. **Data Processing**
- ✅ Frequency Counting (Coin counting)
- ✅ Greedy Selection (Duplicate removal)
- ✅ Time-based Caching (Performance)
- ✅ Fallback Strategy (Reliability)

### 3. **AI/ML**
- ✅ Deep Learning (YOLOv8 CNN)
- ✅ Rule-based AI (Fallback chatbot)
- ✅ Random Walk (Synthetic chart)

### 4. **Web Technologies**
- ✅ REST API (Flask)
- ✅ WebSocket potential (Realtime camera)
- ✅ Base64 Encoding (Image transfer)
- ✅ JSON Serialization (Data format)

---

## Độ Phức Tạp Thuật Toán

| Component | Time Complexity | Space Complexity |
|-----------|----------------|------------------|
| YOLOv8 Detection | O(n) | O(1) |
| Image Resize | O(w×h) | O(w×h) |
| Coin Counting | O(n) | O(k) k=4 |
| Duplicate Removal | O(n) | O(k) |
| API Calls | O(1) | O(1) |
| Chart Generation | O(m) m=points | O(m) |
| Chatbot (rule) | O(1) | O(1) |

**n** = số detections, **w×h** = kích thước ảnh, **m** = số điểm chart

---

## Kết Luận

Hệ thống kết hợp nhiều thuật toán từ Computer Vision, Data Processing đến AI/ML để tạo ra một giải pháp hoàn chỉnh:

1. **Input** → Preprocessing → **YOLOv8** → Post-processing
2. **API Enrichment** → Caching → Fallback
3. **Visualization** → Base64 Encoding
4. **AI Chatbot** → Gemini/Rule-based → Response

**Điểm mạnh:**
- Chính xác cao (YOLOv8)
- Nhanh (caching + optimization)
- Tin cậy (fallback mechanisms)
- Thông minh (AI chatbot)
