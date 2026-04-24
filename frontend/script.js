/**
 * Crypto Logo Detector — Frontend Script
 */

const API_URL = '/detect';

// DOM refs
const tabUpload       = document.getElementById('tabUpload');
const tabCamera       = document.getElementById('tabCamera');
const tabUrl          = document.getElementById('tabUrl');
const panelUpload     = document.getElementById('panelUpload');
const panelCamera     = document.getElementById('panelCamera');
const panelUrl        = document.getElementById('panelUrl');
const dropZone        = document.getElementById('dropZone');
const fileInput       = document.getElementById('fileInput');
const previewWrap     = document.getElementById('previewWrap');
const previewImg      = document.getElementById('previewImg');
const clearBtn        = document.getElementById('clearBtn');
const cameraVideo     = document.getElementById('cameraVideo');
const detectBtn       = document.getElementById('detectBtn');
const loader          = document.getElementById('loader');
const results         = document.getElementById('results');
const annotatedImg    = document.getElementById('annotatedImg');
const totalValue      = document.getElementById('totalValue');
const cardsGrid       = document.getElementById('cardsGrid');

const chartInstances = {};
let selectedFile  = null;
let cameraStream  = null;
let currentMode   = 'upload';
let selectedUrl   = null;   // URL mode

// ── Mode Tabs ───────────────────────────────────────────────────────────────

tabUpload.addEventListener('click', () => switchMode('upload'));
tabCamera.addEventListener('click', () => switchMode('camera'));
tabUrl.addEventListener('click', () => switchMode('url'));

function switchMode(mode) {
  currentMode = mode;
  tabUpload.classList.toggle('active', mode === 'upload');
  tabCamera.classList.toggle('active', mode === 'camera');
  tabUrl.classList.toggle('active', mode === 'url');
  panelUpload.style.display = mode === 'upload' ? 'block' : 'none';
  panelCamera.style.display = mode === 'camera' ? 'block' : 'none';
  panelUrl.style.display = mode === 'url' ? 'block' : 'none';

  if (mode === 'camera') startCamera();
  else stopCamera();

  selectedFile = null;
  selectedUrl = null;
  detectBtn.disabled = true;
  detectBtn.style.display = mode === 'camera' ? 'none' : 'block';
  hideResults();
}

// ── Camera Realtime ──────────────────────────────────────────────────────────

const cameraWrap   = document.getElementById('cameraWrap');
const overlayCanvas = document.getElementById('overlayCanvas');
const snapCanvas   = document.getElementById('snapCanvas');
const rtBadge      = document.getElementById('rtBadge');
const rtDot        = rtBadge.querySelector('.rt-dot');
const rtStatus     = document.getElementById('rtStatus');
const btnStartRT   = document.getElementById('btnStartRT');
const btnStopRT    = document.getElementById('btnStopRT');

let rtInterval = null;   // setInterval handle
let rtRunning  = false;
let rtBusy     = false;  // prevent overlapping requests

const RT_INTERVAL_MS = 1500; // detect every 1.5s

const BBOX_COLORS = { btc: '#FFA500', eth: '#6495ED', link: '#0064FF', sol: '#9945FF' };

async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    cameraVideo.srcObject = cameraStream;
    await new Promise(resolve => { cameraVideo.onloadedmetadata = resolve; });
    cameraVideo.play();
    rtStatus.textContent = 'Sẵn sàng';
    rtDot.classList.remove('live');
  } catch (err) {
    alert('Không thể truy cập camera: ' + err.message);
    switchMode('upload');
  }
}

function stopCamera() {
  stopRealtime();
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
    cameraVideo.srcObject = null;
  }
  clearOverlay();
}

function startRealtime() {
  if (rtRunning) return;
  rtRunning = true;
  btnStartRT.style.display = 'none';
  btnStopRT.style.display  = 'inline-block';
  rtDot.classList.add('live');
  rtStatus.textContent = 'Đang detect...';
  hideResults();
  rtInterval = setInterval(captureAndDetect, RT_INTERVAL_MS);
  captureAndDetect(); // run immediately
}

function stopRealtime() {
  if (!rtRunning) return;
  rtRunning = false;
  clearInterval(rtInterval);
  rtInterval = null;
  btnStartRT.style.display = 'inline-block';
  btnStopRT.style.display  = 'none';
  rtDot.classList.remove('live');
  rtStatus.textContent = 'Đã dừng';
}

btnStartRT.addEventListener('click', startRealtime);
btnStopRT.addEventListener('click', stopRealtime);

async function captureAndDetect() {
  if (rtBusy || !rtRunning) return;
  const w = cameraVideo.videoWidth;
  const h = cameraVideo.videoHeight;
  if (!w || !h) return;

  rtBusy = true;
  snapCanvas.width  = w;
  snapCanvas.height = h;
  snapCanvas.getContext('2d').drawImage(cameraVideo, 0, 0, w, h);

  snapCanvas.toBlob(async blob => {
    if (!blob) { rtBusy = false; return; }
    const formData = new FormData();
    formData.append('image', new File([blob], 'frame.jpg', { type: 'image/jpeg' }));
    try {
      const resp = await fetch('/detect', { method: 'POST', body: formData });
      if (!resp.ok) throw new Error(resp.status);
      const data = await resp.json();
      drawOverlay(data.detections, w, h);
      if (data.detections && data.detections.length > 0) {
        rtStatus.textContent = `Tìm thấy: ${data.detections.map(d => (COIN_DISPLAY[d.name] || d.name)).join(', ')}`;
        renderResults(data);
      } else {
        rtStatus.textContent = 'Không tìm thấy logo...';
        clearOverlay();
      }
    } catch (e) {
      rtStatus.textContent = 'Lỗi kết nối';
    } finally {
      rtBusy = false;
    }
  }, 'image/jpeg', 0.85);
}

function drawOverlay(detections, srcW, srcH) {
  const rect = cameraVideo.getBoundingClientRect();
  overlayCanvas.width  = rect.width;
  overlayCanvas.height = rect.height;
  const scaleX = rect.width  / srcW;
  const scaleY = rect.height / srcH;
  const ctx = overlayCanvas.getContext('2d');
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

  (detections || []).forEach(det => {
    const [x1, y1, x2, y2] = det.bbox;
    const rx1 = x1 * scaleX, ry1 = y1 * scaleY;
    const rw  = (x2 - x1) * scaleX, rh = (y2 - y1) * scaleY;
    const color = BBOX_COLORS[det.name] || '#00c896';

    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.strokeRect(rx1, ry1, rw, rh);

    const label = `${COIN_DISPLAY[det.name] || det.name} ${(det.confidence * 100).toFixed(0)}%`;
    ctx.font      = 'bold 13px sans-serif';
    const tw      = ctx.measureText(label).width;
    ctx.fillStyle = color;
    ctx.fillRect(rx1, ry1 - 20, tw + 8, 20);
    ctx.fillStyle = '#fff';
    ctx.fillText(label, rx1 + 4, ry1 - 5);
  });
}

function clearOverlay() {
  const ctx = overlayCanvas.getContext('2d');
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
}

// ── File Upload ──────────────────────────────────────────────────────────────

dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) setFile(file);
});
fileInput.addEventListener('change', () => { if (fileInput.files[0]) setFile(fileInput.files[0]); });
clearBtn.addEventListener('click', clearFile);

function setFile(file) {
  selectedFile = file;
  previewImg.src = URL.createObjectURL(file);
  previewWrap.style.display = 'block';
  dropZone.style.display = 'none';
  detectBtn.disabled = false;
  hideResults();
}

function clearFile() {
  selectedFile = null;
  fileInput.value = '';
  previewImg.src = '';
  previewWrap.style.display = 'none';
  dropZone.style.display = 'block';
  detectBtn.disabled = true;
  hideResults();
}

// ── URL Loading ──────────────────────────────────────────────────────────────

const urlInput = document.getElementById('urlInput');
const btnUrlLoad = document.getElementById('btnUrlLoad');
const urlPreviewWrap = document.getElementById('urlPreviewWrap');
const urlPreviewImg = document.getElementById('urlPreviewImg');
const urlInputWrap = document.getElementById('urlInputWrap');
const urlClearBtn = document.getElementById('urlClearBtn');

btnUrlLoad.addEventListener('click', async () => {
  const url = urlInput.value.trim();
  if (!url) {
    alert('Vui lòng nhập URL ảnh');
    return;
  }

  btnUrlLoad.disabled = true;
  btnUrlLoad.textContent = '⏳ Đang tải...';

  try {
    const resp = await fetch('/load-image-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!resp.ok) {
      if (resp.status === 400) {
        throw new Error('URL không hợp lệ hoặc không thể truy cập');
      } else if (resp.status === 422) {
        throw new Error('URL không chứa ảnh hợp lệ (JPG, PNG, WEBP)');
      }
      throw new Error(`Server error: ${resp.status}`);
    }

    const data = await resp.json();
    selectedUrl = data.url;
    urlPreviewImg.src = data.url;
    urlInputWrap.style.display = 'none';
    urlPreviewWrap.style.display = 'block';
    detectBtn.disabled = false;
  } catch (err) {
    alert(`Lỗi tải ảnh: ${err.message}`);
    console.error(err);
  } finally {
    btnUrlLoad.disabled = false;
    btnUrlLoad.textContent = 'Tải ảnh';
  }
});

urlClearBtn.addEventListener('click', () => {
  selectedUrl = null;
  urlInput.value = '';
  urlPreviewImg.src = '';
  urlInputWrap.style.display = 'block';
  urlPreviewWrap.style.display = 'none';
  detectBtn.disabled = true;
  hideResults();
});

// Allow Enter key to load URL
urlInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    btnUrlLoad.click();
  }
});

function hideResults() {
  results.style.display = 'none';
  cardsGrid.innerHTML = '';
  Object.values(chartInstances).forEach(c => c.destroy());
  Object.keys(chartInstances).forEach(k => delete chartInstances[k]);
}

// ── Detection ────────────────────────────────────────────────────────────────

detectBtn.addEventListener('click', async () => {
  if (!selectedFile && !selectedUrl) return;

  loader.style.display = 'flex';
  results.style.display = 'none';
  detectBtn.disabled = true;

  try {
    let resp;
    
    if (selectedFile) {
      // File upload mode
      const formData = new FormData();
      formData.append('image', selectedFile);
      resp = await fetch(API_URL, { method: 'POST', body: formData });
    } else if (selectedUrl) {
      // URL mode - send to backend with URL
      resp = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: selectedUrl }),
      });
    }
    
    if (!resp.ok) throw new Error(`Server error: ${resp.status}`);
    const data = await resp.json();
    renderResults(data);
  } catch (err) {
    alert(`Detection failed: ${err.message}`);
    console.error(err);
  } finally {
    loader.style.display = 'none';
    detectBtn.disabled = false;
  }
});

// ── Render Results ──────────────────────────────────────────────────────────

function renderResults(data) {
  const { detections, total_value, annotated_image } = data;

  annotatedImg.src = `data:image/png;base64,${annotated_image}`;

  // Total value = price * count for each coin
  const computedTotal = detections.reduce((sum, det) => sum + (det.price || 0) * (det.count || 1), 0);
  totalValue.textContent = formatCurrency(computedTotal);

  // Breakdown: "Bitcoin ×2: $194,000 + Ethereum: $3,500"
  const breakdown = detections
    .filter(d => d.price)
    .map(d => {
      const name = COIN_DISPLAY[d.name] || d.name;
      const count = d.count || 1;
      const subtotal = formatCurrency(d.price * count);
      return count > 1 ? `${name} ×${count}: ${subtotal}` : `${name}: ${formatCurrency(d.price)}`;
    })
    .join(' + ');
  document.getElementById('portfolioBreakdown').textContent = breakdown;

  cardsGrid.innerHTML = '';
  detections.forEach((det, idx) => {
    const card = buildCard(det, idx);
    cardsGrid.appendChild(card);
  });

  results.style.display = 'block';
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });

  detections.forEach((det, idx) => {
    initChart(det, idx, '7d');
  });

  // Init chatbot with detected coins
  initChatbot(detections);
}

// ── Card Builder ─────────────────────────────────────────────────────────────

const COIN_EMOJI = { btc: '₿', eth: 'Ξ', link: '⬡', sol: '◎' };

// Display name mapping
const COIN_DISPLAY = { btc: 'Bitcoin', eth: 'Ethereum', link: 'Chainlink', sol: 'Solana' };

function buildCard(det, idx) {
  const change = det.change_24h;
  const changeClass = change >= 0 ? 'positive' : 'negative';
  const changeSign  = change >= 0 ? '+' : '';

  const card = document.createElement('div');
  card.className = 'coin-card';
  card.innerHTML = `
    <div class="card-header">
      ${det.image_url
        ? `<img src="${det.image_url}" alt="${det.name}" />`
        : `<div class="coin-icon-fallback">${COIN_EMOJI[det.name] || '🪙'}</div>`}
      <span class="card-name">${COIN_DISPLAY[det.name] || det.name}${det.count > 1 ? ` <span class="card-count">×${det.count}</span>` : ''}</span>
      <span class="card-conf">conf: ${(det.confidence * 100).toFixed(1)}%</span>
      ${det.is_fallback ? `<span class="card-fallback" title="Live data unavailable">~est</span>` : ''}
    </div>

    <div class="card-price">${det.price != null ? formatCurrency(det.price) : 'N/A'}</div>

    <div class="card-change ${changeClass}">
      ${change != null ? `${changeSign}${change.toFixed(2)}% (24h)` : '—'}
    </div>

    <div class="card-stats">
      <div class="stat-item">
        <div class="stat-label">Market Cap</div>
        <div class="stat-value">${det.market_cap != null ? formatCompact(det.market_cap) : '—'}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Volume 24h</div>
        <div class="stat-value">${det.volume != null ? formatCompact(det.volume) : '—'}</div>
      </div>
    </div>

    <div>
      <div class="chart-tabs">
        <button class="chart-tab active" data-idx="${idx}" data-range="7d">7D</button>
        <button class="chart-tab" data-idx="${idx}" data-range="24h">24H</button>
      </div>
      <div class="chart-wrap">
        <canvas id="chart-${idx}"></canvas>
      </div>
    </div>
  `;

  // Tab switching
  card.querySelectorAll('.chart-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      card.querySelectorAll('.chart-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const range = btn.dataset.range;
      // Find the detection by idx
      const allCards = [...document.querySelectorAll('.coin-card')];
      const detIdx = parseInt(btn.dataset.idx);
      // We need the detection data — store it on the canvas
      const canvas = document.getElementById(`chart-${detIdx}`);
      const chartData = canvas._detData;
      if (chartData) initChart(chartData, detIdx, range);
    });
  });

  return card;
}

// ── Chart Init ───────────────────────────────────────────────────────────────

function initChart(det, idx, range) {
  const canvas = document.getElementById(`chart-${idx}`);
  if (!canvas) return;

  // Store det data on canvas for tab switching
  canvas._detData = det;

  const rawData = det.chart?.[range] || [];
  const labels  = rawData.map(p => {
    const d = new Date(p[0]);
    return range === '24h'
      ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  });
  const prices = rawData.map(p => p[1]);

  const isPositive = prices.length > 1 && prices[prices.length - 1] >= prices[0];
  const lineColor  = isPositive ? '#00c896' : '#ff4d6d';

  // Destroy existing chart if any
  if (chartInstances[idx]) {
    chartInstances[idx].destroy();
    delete chartInstances[idx];
  }

  chartInstances[idx] = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: prices,
        borderColor: lineColor,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.4,
        fill: true,
        backgroundColor: ctx => {
          const gradient = ctx.chart.ctx.createLinearGradient(0, 0, 0, 100);
          gradient.addColorStop(0, lineColor + '40');
          gradient.addColorStop(1, lineColor + '00');
          return gradient;
        },
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: {
          label: ctx => `$${ctx.parsed.y.toLocaleString()}`
        }
      }},
      scales: {
        x: { display: false },
        y: { display: false },
      },
      animation: { duration: 400 },
    },
  });
}

// ── Formatters ───────────────────────────────────────────────────────────────

function formatCurrency(val) {
  if (val == null) return 'N/A';
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    maximumFractionDigits: val >= 1 ? 2 : 6,
  }).format(val);
}

function formatCompact(val) {
  if (val == null) return '—';
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9)  return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6)  return `$${(val / 1e6).toFixed(2)}M`;
  return `$${val.toLocaleString()}`;
}

// ── Chatbot ──────────────────────────────────────────────────────────────────

let chatDetections = [];   // coins from last detect
let activeCoinIdx  = 0;    // which coin is selected in chatbot

function initChatbot(detections) {
  if (!detections || detections.length === 0) return;
  chatDetections = detections;
  activeCoinIdx  = 0;

  // Build coin selector buttons
  const selector = document.getElementById('chatCoinSelector');
  selector.innerHTML = '';
  detections.forEach((det, i) => {
    const btn = document.createElement('button');
    btn.className = 'coin-select-btn' + (i === 0 ? ' active' : '');
    btn.textContent = COIN_DISPLAY[det.name] || det.name;
    btn.dataset.idx = i;
    btn.addEventListener('click', () => {
      activeCoinIdx = i;
      selector.querySelectorAll('.coin-select-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      // Hide answer when switching coin
      document.getElementById('chatAnswer').style.display = 'none';
    });
    selector.appendChild(btn);
  });

  document.getElementById('chatbotSection').style.display = 'block';
}

// Suggestion buttons
document.getElementById('chatSuggestions').addEventListener('click', async e => {
  const btn = e.target.closest('.chat-suggest-btn');
  if (!btn || chatDetections.length === 0) return;
  
  const question = btn.dataset.q;
  const det = chatDetections[activeCoinIdx];
  
  // Show loading
  const answerDiv = document.getElementById('chatAnswer');
  const answerText = document.getElementById('answerText');
  answerDiv.style.display = 'block';
  answerText.textContent = '⏳ Đang phân tích...';
  
  try {
    const resp = await fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        coinName:  COIN_DISPLAY[det.name] || det.name,
        price:     det.price,
        change24h: det.change_24h != null ? det.change_24h.toFixed(2) : 'N/A',
        marketCap: det.market_cap != null ? formatCompact(det.market_cap) : 'N/A',
        volume:    det.volume     != null ? formatCompact(det.volume)     : 'N/A',
        question,
      }),
    });

    if (!resp.ok) throw new Error(`Server error ${resp.status}`);
    const data = await resp.json();
    if (data.error) throw new Error(data.error);
    
    answerText.textContent = data.answer;
  } catch (err) {
    answerText.textContent = `⚠️ Lỗi: ${err.message}`;
  }
});

