"""
Crypto Logo Detection API
Uses YOLOv8 to detect cryptocurrency logos and fetches live data from CoinGecko.
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import numpy as np
import requests
import base64
import os
import time
from PIL import Image
import io

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend')
app = Flask(__name__, static_folder=FRONTEND_DIR, static_url_path='')
CORS(app)

@app.route('/')
def index():
    return send_from_directory(FRONTEND_DIR, 'index.html')

# Load YOLOv8 model
MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'best.pt')
model = YOLO(MODEL_PATH)

# Model classes: {0: 'BTC', 1: 'ETH', 2: 'LINK', 3: 'SOL'}
COIN_ID_MAP = {
    'btc':  'bitcoin',
    'eth':  'ethereum',
    'link': 'chainlink',
    'sol':  'solana',
}

COINGECKO_BASE = 'https://api.coingecko.com/api/v3'
HEADERS = {'User-Agent': 'Mozilla/5.0 CryptoDetector/1.0', 'Accept': 'application/json'}

# ── Fallback static data (used when API is rate-limited) ──────────────────────
FALLBACK_DATA = {
    'bitcoin':   {'current_price': 97000,  'price_change_percentage_24h': 1.2,  'market_cap': 1900000000000, 'total_volume': 35000000000,  'image': 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'},
    'ethereum':  {'current_price': 3500,   'price_change_percentage_24h': -0.8, 'market_cap': 420000000000,  'total_volume': 18000000000,  'image': 'https://assets.coingecko.com/coins/images/279/large/ethereum.png'},
    'chainlink': {'current_price': 18,     'price_change_percentage_24h': 2.1,  'market_cap': 11000000000,   'total_volume': 600000000,    'image': 'https://assets.coingecko.com/coins/images/877/large/chainlink-new-logo.png'},
    'solana':    {'current_price': 185,    'price_change_percentage_24h': 3.4,  'market_cap': 85000000000,   'total_volume': 4000000000,   'image': 'https://assets.coingecko.com/coins/images/4128/large/solana.png'},
}

# ── Simple in-memory cache (TTL = 5 minutes) ──────────────────────────────────
_cache = {}
CACHE_TTL = 300  # seconds

def cache_get(key):
    entry = _cache.get(key)
    if entry and (time.time() - entry['ts']) < CACHE_TTL:
        return entry['data']
    return None

def cache_set(key, data):
    _cache[key] = {'ts': time.time(), 'data': data}


def fetch_coin_data(coin_ids: list) -> dict:
    """Fetch market data, use cache then fallback if API fails."""
    cache_key = 'markets_' + '_'.join(sorted(set(coin_ids)))
    cached = cache_get(cache_key)
    if cached:
        print(f"[Cache] markets hit")
        return cached

    ids_str = ','.join(set(coin_ids))
    try:
        resp = requests.get(
            f"{COINGECKO_BASE}/coins/markets",
            params={'vs_currency': 'usd', 'ids': ids_str, 'price_change_percentage': '24h'},
            headers=HEADERS, timeout=15
        )
        print(f"[CoinGecko markets] status={resp.status_code}")
        if resp.status_code == 429:
            raise Exception("Rate limited")
        resp.raise_for_status()
        data = {c['id']: c for c in resp.json()}
        cache_set(cache_key, data)
        return data
    except Exception as e:
        print(f"[CoinGecko markets] failed: {e} — using fallback")
        # Return fallback for requested coins only
        return {cid: FALLBACK_DATA[cid] for cid in set(coin_ids) if cid in FALLBACK_DATA}


def fetch_chart_data(coin_id: str, days: int = 7) -> list:
    """Fetch chart data, use cache then fallback if API fails."""
    cache_key = f'chart_{coin_id}_{days}'
    cached = cache_get(cache_key)
    if cached:
        print(f"[Cache] chart hit {coin_id} {days}d")
        return cached

    try:
        resp = requests.get(
            f"{COINGECKO_BASE}/coins/{coin_id}/market_chart",
            params={'vs_currency': 'usd', 'days': days},
            headers=HEADERS, timeout=15
        )
        print(f"[CoinGecko chart] {coin_id} {days}d status={resp.status_code}")
        if resp.status_code == 429:
            raise Exception("Rate limited")
        resp.raise_for_status()
        prices = [[int(p[0]), round(p[1], 4)] for p in resp.json().get('prices', [])]
        cache_set(cache_key, prices)
        return prices
    except Exception as e:
        print(f"[CoinGecko chart] failed: {e} — using fallback")
        return _generate_fallback_chart(coin_id, days)


def _generate_fallback_chart(coin_id: str, days: int) -> list:
    """Generate a plausible-looking chart from fallback price."""
    import random
    base_price = FALLBACK_DATA.get(coin_id, {}).get('current_price', 100)
    points = days * 24 if days == 1 else days
    now_ms = int(time.time() * 1000)
    interval_ms = (days * 86400 * 1000) // points
    result = []
    price = base_price * 0.95
    for i in range(points):
        price *= (1 + random.uniform(-0.015, 0.015))
        ts = now_ms - (points - i) * interval_ms
        result.append([ts, round(price, 4)])
    return result


def draw_boxes(image_np: np.ndarray, detections: list) -> str:
    """Draw bounding boxes on image and return as base64 PNG."""
    img = image_np.copy()
    colors = {
        'btc':  (255, 165, 0),
        'eth':  (100, 149, 237),
        'link': (0, 100, 255),
        'sol':  (153, 69, 255),
    }
    for det in detections:
        x1, y1, x2, y2 = det['bbox']
        color = colors.get(det['name'], (0, 255, 0))
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)
        text = f"{det['name'].upper()} {det['confidence']:.0%}"
        (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
        cv2.rectangle(img, (x1, y1 - th - 8), (x1 + tw + 4, y1), color, -1)
        cv2.putText(img, text, (x1 + 2, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    _, buffer = cv2.imencode('.png', img)
    return base64.b64encode(buffer).decode('utf-8')


@app.route('/detect', methods=['POST'])
def detect():
    if 'image' not in request.files:
        return jsonify({'error': 'No image provided'}), 400

    img_bytes = request.files['image'].read()
    pil_img = Image.open(io.BytesIO(img_bytes)).convert('RGB')
    # Resize nếu ảnh quá lớn (camera 4K+), giới hạn 1280px để YOLO xử lý tốt hơn
    w, h = pil_img.size
    if max(w, h) > 1280:
        scale = 1280 / max(w, h)
        pil_img = pil_img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
    img_np = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)

    # Run YOLO
    results = model(img_np, conf=0.15)[0]
    print(f"[YOLO] boxes found: {len(results.boxes)}")

    detections = []
    for box in results.boxes:
        cls_id = int(box.cls[0])
        class_name = model.names[cls_id].lower()
        conf = float(box.conf[0])
        print(f"[YOLO] {class_name} conf={conf:.2f}")
        if class_name not in COIN_ID_MAP:
            continue
        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
        detections.append({
            'name': class_name,
            'coin_id': COIN_ID_MAP[class_name],
            'confidence': round(conf, 4),
            'bbox': [x1, y1, x2, y2],
        })

    print(f"[DETECT] valid detections: {len(detections)}")

    if not detections:
        return jsonify({
            'detections': [],
            'total_value': 0,
            'annotated_image': draw_boxes(img_np, []),
            'coin_counts': {},
            'message': 'No crypto logos detected in this image.'
        })

    # Fetch market data (with cache + fallback)
    coin_ids = [d['coin_id'] for d in detections]
    market_data = fetch_coin_data(coin_ids)

    # Fetch chart data one by one with small delay to avoid rate limit
    chart_cache = {}
    for coin_id in set(coin_ids):
        chart_cache[coin_id] = {
            '24h': fetch_chart_data(coin_id, days=1),
            '7d':  fetch_chart_data(coin_id, days=7),
        }
        time.sleep(0.5)  # small delay between chart requests

    # Enrich detections — 1 card per unique coin (keep highest confidence)
    seen = {}
    for det in detections:
        cid = det['coin_id']
        # Keep the detection with highest confidence for each coin
        if cid not in seen or det['confidence'] > seen[cid]['confidence']:
            seen[cid] = det

    enriched = []
    coin_counts = {}
    # Count how many times each coin appeared (for portfolio calc)
    for det in detections:
        coin_counts[det['coin_id']] = coin_counts.get(det['coin_id'], 0) + 1

    for cid, det in seen.items():
        mkt = market_data.get(cid, FALLBACK_DATA.get(cid, {}))
        enriched.append({
            **det,
            'count':      coin_counts[cid],
            'price':      mkt.get('current_price'),
            'change_24h': mkt.get('price_change_percentage_24h'),
            'market_cap': mkt.get('market_cap'),
            'volume':     mkt.get('total_volume'),
            'image_url':  mkt.get('image'),
            'chart':      chart_cache.get(cid, {}),
            'is_fallback': cid not in market_data,
        })

    # Total = price * count for each unique coin
    total_value = sum(
        (market_data.get(cid) or FALLBACK_DATA.get(cid, {})).get('current_price', 0) * coin_counts[cid]
        for cid in seen.keys()
    )

    return jsonify({
        'detections': enriched,
        'total_value': round(total_value, 2),
        'annotated_image': draw_boxes(img_np, detections),
        'coin_counts': coin_counts,
    })


# ── Hybrid Chatbot (Gemini + Smart Fallback) ─────────────────────────────────

GEMINI_API_KEY = 'AIzaSyA2d9qBQ7EdHqySWvIleQNdf9jaTeMcRyU'
GEMINI_MODEL = 'gemini-2.5-flash'
GEMINI_URL = f'https://generativelanguage.googleapis.com/v1/models/{GEMINI_MODEL}:generateContent'

def get_smart_fallback_answer(coin_name, price, change_24h, market_cap, volume, question):
    """Smart mock response when Gemini fails"""
    question_lower = question.lower()
    
    # Parse change value
    try:
        change_val = float(str(change_24h).replace('%', ''))
    except:
        change_val = 0
    
    if 'mua' in question_lower or 'nên' in question_lower or 'buy' in question_lower:
        if change_val > 3:
            return f"{coin_name} đang tăng mạnh {change_24h}% trong 24h, momentum tích cực. Tuy nhiên sau đợt tăng mạnh thường có điều chỉnh, nên cân nhắc chờ pullback. Lưu ý: Crypto rất biến động, chỉ đầu tư số tiền bạn có thể mất."
        elif change_val > 0:
            return f"Với mức tăng {change_24h}%, {coin_name} đang tích cực nhưng chưa quá nóng. Market cap {market_cap} và volume {volume} cho thấy thanh khoản {'tốt' if 'B' in str(volume) else 'trung bình'}."
        else:
            return f"{coin_name} đang giảm {change_24h}% - có thể là cơ hội nếu tin vào fundamentals. Hãy chờ xác nhận đáy trước khi vào lệnh. Với market cap {market_cap}, rủi ro {'thấp hơn' if 'T' in str(market_cap) or 'B' in str(market_cap) else 'cao'}. Đừng bắt dao đang rơi!"
    
    elif 'xu hướng' in question_lower or 'trend' in question_lower or 'phân tích' in question_lower:
        trend = 'tăng' if change_val > 0 else 'giảm'
        return f"Phân tích {coin_name}: Giá ${price}, {trend} {abs(change_val):.1f}% trong 24h. Market cap {market_cap} xếp {'top tier' if 'T' in str(market_cap) else 'mid-cap' if 'B' in str(market_cap) else 'small-cap'}, volume {volume} cho thấy thanh khoản {'tốt' if 'B' in str(volume) else 'hạn chế'}. Xu hướng ngắn hạn {'tích cực' if change_val > 0 else 'tiêu cực'}."
    
    elif 'rủi ro' in question_lower or 'risk' in question_lower:
        return f"Rủi ro {coin_name}: (1) Biến động giá cao - có thể mất 30-50% trong vài ngày, (2) Rủi ro công nghệ - lỗi smart contract, hack, (3) Rủi ro thanh khoản, (4) Rủi ro pháp lý. Với market cap {market_cap}, {'rủi ro thấp hơn altcoin nhỏ' if 'T' in str(market_cap) or 'B' in str(market_cap) else 'rủi ro rất cao'}. Chỉ đầu tư số tiền sẵn sàng mất!"
    
    elif 'giá' in question_lower or 'price' in question_lower:
        return f"Giá {coin_name} hiện tại là ${price}, {'tăng' if change_val > 0 else 'giảm'} {abs(change_val):.1f}% trong 24h. Volume {volume} cho thấy {'sự quan tâm lớn' if 'B' in str(volume) else 'thanh khoản trung bình'}. Giá crypto thay đổi liên tục, hãy theo dõi thường xuyên!"
    
    else:
        return f"Về {coin_name}: Giá ${price} ({'tăng' if change_val > 0 else 'giảm'} {abs(change_val):.1f}% trong 24h). Market cap {market_cap}, volume {volume}. Đây là {'coin lớn, rủi ro thấp hơn' if 'T' in str(market_cap) or 'B' in str(market_cap) else 'altcoin nhỏ, rủi ro cao'}."

@app.route('/chat', methods=['POST'])
def chat():
    """Hybrid chatbot: Try Gemini first, fallback to smart mock"""
    body = request.get_json()
    if not body:
        return jsonify({'error': 'No data provided'}), 400

    coin_name  = body.get('coinName', 'Unknown')
    price      = body.get('price', 'N/A')
    change_24h = body.get('change24h', 'N/A')
    market_cap = body.get('marketCap', 'N/A')
    volume     = body.get('volume', 'N/A')
    question   = body.get('question', '').strip()

    if not question:
        return jsonify({'error': 'No question provided'}), 400

    # Try Gemini API first
    prompt = f"""Bạn là chuyên gia crypto. Dữ liệu {coin_name}: giá ${price}, thay đổi 24h {change_24h}%, market cap {market_cap}, volume {volume}.

Câu hỏi: {question}

Trả lời ngắn gọn 2-3 câu bằng tiếng Việt, có cảnh báo rủi ro nếu cần."""

    try:
        resp = requests.post(
            GEMINI_URL,
            params={'key': GEMINI_API_KEY},
            json={
                'contents': [{'parts': [{'text': prompt}]}],
                'generationConfig': {'temperature': 0.7, 'maxOutputTokens': 500}
            },
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        
        if resp.status_code == 200:
            result = resp.json()
            if 'candidates' in result and len(result['candidates']) > 0:
                answer = result['candidates'][0]['content']['parts'][0]['text']
                print(f"[Gemini] Success: {len(answer)} chars")
                return jsonify({'answer': answer.strip()})
        
        # Gemini failed, use fallback
        print(f"[Gemini] Failed with status {resp.status_code}, using fallback")
        
    except Exception as e:
        print(f"[Gemini] Exception: {e}, using fallback")
    
    # Fallback to smart mock
    answer = get_smart_fallback_answer(coin_name, price, change_24h, market_cap, volume, question)
    print(f"[Fallback] {len(answer)} chars")
    return jsonify({'answer': answer})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
