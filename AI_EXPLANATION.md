Nội dung chính:
1️⃣ AI nằm ở đâu:
AI #1: YOLOv8 (Computer Vision) - phát hiện logo
AI #2: Gemini/Rule-based (NLP) - chatbot tư vấn
2️⃣ F(X) cho YOLOv8:
F = YOLOv8 Neural Network (CSPDarknet + PANet + Head)
X = Image array (H×W×3)
F(X) = Detections (class, bbox, confidence)
3️⃣ F(X) cho Chatbot:
F = Gemini LLM / Rule-based Decision Tree
X = {coin_name, price, change_24h, question}
F(X) = Natural language analysis text
4️⃣ Công thức toán học:
YOLOv8: F(X) = argmax(Softmax(Head(Neck(Backbone(X)))))
Gemini: F(X) = Transformer(Prompt(X))
Pipeline: Output = F₂(Enrich(F₁(Preprocess(Input))))
5️⃣ Ví dụ thực tế đầy đủ với input/output cụ thể




# Giải Thích AI Trong Project

## 1. AI Nằm Ở Đâu Trong Bài Tập?

Project sử dụng **2 loại AI** chính:

### 🤖 AI #1: YOLOv8 (Computer Vision)
**Vị trí:** Backend - Module Detection
**Chức năng:** Phát hiện và nhận diện logo cryptocurrency trong ảnh

### 🤖 AI #2: Rule-based Chatbot (NLP)
**Vị trí:** Backend - Module Chatbot
**Chức năng:** Phân tích và tư vấn về cryptocurrency

---

## 2. Công Thức F(X) - Giải Thích Chi Tiết

### 📊 **AI #1: YOLOv8 Detection**

#### **F (Function - Hàm)**
```
F = YOLOv8 Neural Network
```

**Cấu trúc của F:**
- **Backbone:** CSPDarknet (trích xuất features)
- **Neck:** PANet (kết hợp features)
- **Head:** Decoupled Head (classification + regression)

**Tham số của F:**
- Weights: `best.pt` (đã train trên dataset crypto logos)
- Layers: ~300 layers
- Parameters: ~25 million parameters

#### **X (Input - Đầu vào)**
```python
X = {
    'image': numpy.ndarray,      # Ảnh đầu vào (H×W×3)
    'confidence': 0.15,          # Ngưỡng confidence
    'input_size': (640, 640)     # Kích thước input chuẩn
}
```

**Ví dụ cụ thể:**
```python
X = image_array  # Shape: (720, 1280, 3) - RGB image
```

#### **F(X) (Output - Đầu ra)**
```python
F(X) = {
    'detections': [
        {
            'class': 'BTC',           # Class được dự đoán
            'confidence': 0.92,       # Độ tin cậy 92%
            'bbox': [100, 150, 300, 350],  # [x1, y1, x2, y2]
            'class_id': 0             # ID của class
        },
        {
            'class': 'ETH',
            'confidence': 0.87,
            'bbox': [400, 200, 600, 400],
            'class_id': 1
        }
    ],
    'num_detections': 2
}
```

**Công thức toán học:**

```
F(X) = argmax(Softmax(Head(Neck(Backbone(X)))))

Trong đó:
- Backbone(X): Feature extraction → Feature maps
- Neck(Features): Feature fusion → Multi-scale features  
- Head(Features): Classification + Regression → Predictions
- Softmax: Normalize probabilities
- argmax: Chọn class có xác suất cao nhất
```

**Chi tiết từng bước:**

1. **Backbone (CSPDarknet):**
   ```
   X → Conv layers → Feature maps [P3, P4, P5]
   ```

2. **Neck (PANet):**
   ```
   [P3, P4, P5] → Bottom-up + Top-down → Enhanced features
   ```

3. **Head (Decoupled):**
   ```
   Features → Classification branch → Class probabilities
            → Regression branch → Bounding boxes
   ```

4. **Post-processing:**
   ```
   Raw predictions → NMS (Non-Maximum Suppression) → Final detections
   ```

---

### 💬 **AI #2: Chatbot ( Rule-based)**

#### **F (Function - Hàm)**

**Rule-based Fallback**
```
F = Rule-based Decision Tree
```

**Cấu trúc của F:**
```python
def F(X):
    if 'mua' in X['question']:
        if X['change_24h'] > 3:
            return "Tăng mạnh, cân nhắc chờ pullback..."
        elif X['change_24h'] > 0:
            return "Tích cực, có thể DCA..."
        else:
            return "Giảm giá, đừng bắt dao rơi..."
    elif 'rủi ro' in X['question']:
        return "Rủi ro: biến động cao, hack, pháp lý..."
    # ... more rules
```

#### **X (Input - Đầu vào)**
```python
X = {
    'coin_name': 'Bitcoin',
    'price': 97000,
    'change_24h': 1.2,
    'market_cap': '1.9T',
    'volume': '35B',
    'question': 'BTC có nên mua không?'
}
```

#### **F(X) (Output - Đầu ra)**
```python
F(X) = {
    'answer': """
        Với mức tăng 1.2%, Bitcoin đang tích cực nhưng chưa quá nóng. 
        Market cap 1.9T và volume 35B cho thấy thanh khoản tốt. 
        Có thể DCA nếu tin vào dự án dài hạn. Luôn DYOR!
    """
}
```

**Công thức toán học (Gemini):**

```
F(X) = Transformer(Prompt(X))

Trong đó:
- Prompt(X): Template formatting input
- Transformer: Multi-head attention + Feed-forward
- Output: Generated text response
```

**Chi tiết:**

1. **Prompt Engineering:**
   ```python
   prompt = f"""
   Bạn là chuyên gia crypto. 
   Dữ liệu {X['coin_name']}: giá ${X['price']}, 
   thay đổi 24h {X['change_24h']}%...
   
   Câu hỏi: {X['question']}
   """
   ```

2. **Transformer Processing:**
   ```
   Prompt → Tokenization → Embedding → 
   Multi-head Attention → Feed-forward → 
   Decoder → Token generation → Text
   ```

3. **Generation Config:**
   ```python
   {
       'temperature': 0.7,      # Creativity level
       'maxOutputTokens': 500   # Max length
   }
   ```

---

## 3. So Sánh 2 AI

| Aspect | YOLOv8 (Detection) | Gemini/Rule-based (Chatbot) |
|--------|-------------------|----------------------------|
| **F** | CNN (Convolutional Neural Network) | Transformer LLM / Decision Tree |
| **X** | Image (numpy array) | Text + Structured data (dict) |
| **F(X)** | Bounding boxes + Classes | Natural language text |
| **Training** | Supervised learning (labeled images) | Pre-trained + Fine-tuned / Hand-crafted rules |
| **Inference time** | ~50-200ms | ~1-3s (API) / <1ms (rule-based) |
| **Model size** | ~50MB | ~Billions params (cloud) / ~1KB (rules) |

---

## 4. Ví Dụ Thực Tế Đầy Đủ

### **Scenario:** User upload ảnh có logo BTC và ETH

#### **Step 1: YOLOv8 Detection**

**Input X₁:**
```python
X₁ = image_array  # Shape: (1080, 1920, 3)
```

**Function F₁:**
```python
F₁ = YOLOv8(weights='best.pt', conf=0.15)
```

**Output F₁(X₁):**
```python
F₁(X₁) = [
    {'class': 'BTC', 'confidence': 0.94, 'bbox': [200, 300, 450, 550]},
    {'class': 'ETH', 'confidence': 0.89, 'bbox': [800, 400, 1050, 650]}
]
```

#### **Step 2: Chatbot Analysis**

**Input X₂:**
```python
X₂ = {
    'coin_name': 'Bitcoin',
    'price': 97000,
    'change_24h': 1.2,
    'market_cap': '1.9T',
    'volume': '35B',
    'question': 'BTC có nên mua không?'
}
```

**Function F₂:**
```python
F₂ = Rule_based_chatbot()
```

**Output F₂(X₂):**
```python
F₂(X₂) = """
Với mức tăng 1.2%, Bitcoin đang ở trạng thái tích cực nhưng chưa quá nóng. 
Market cap 1.9T và volume 35B cho thấy thanh khoản tốt, đây là coin lớn với 
rủi ro thấp hơn. Có thể DCA (Dollar Cost Averaging) nếu bạn tin vào dự án 
dài hạn. Lưu ý: Crypto rất biến động, chỉ đầu tư số tiền bạn có thể mất!
"""
```

---

## 5. Công Thức Tổng Quát

### **Pipeline đầy đủ:**

```
User Input (Image) 
    ↓
X₁ = Preprocessed_Image
    ↓
F₁(X₁) = YOLOv8(X₁) → Detections
    ↓
X₂ = Enrich_with_market_data(F₁(X₁))
    ↓
F₂(X₂) = Chatbot(X₂) → Analysis
    ↓
Final Output = {
    'detections': F₁(X₁),
    'market_data': X₂,
    'ai_analysis': F₂(X₂)
}
```

### **Biểu diễn toán học:**

```
Output = F₂(Enrich(F₁(Preprocess(Input))))

Trong đó:
- Preprocess: Resize, normalize, color conversion
- F₁: YOLOv8 detection
- Enrich: Fetch market data from API
- F₂: Chatbot analysis
```

---

## 6. Kết Luận

### **F (Function):**
- **YOLOv8:** Deep CNN với 300+ layers, 25M parameters
- **Gemini:** Transformer LLM với billions parameters
- **Rule-based:** Decision tree với ~10 rules

### **X (Input):**
- **YOLOv8:** Image tensor (H×W×3)
- **Chatbot:** Structured data (coin info + question)

### **F(X) (Output):**
- **YOLOv8:** List of detections (class, bbox, confidence)
- **Chatbot:** Natural language analysis text

### **Đặc điểm AI trong project:**
✅ **Multi-modal:** Vision (YOLOv8) + Language (Gemini)  
✅ **Hybrid:** Deep Learning + Rule-based  
✅ **Real-time:** Inference < 3s  
✅ **Practical:** Kết hợp AI với real-world data (market API)
