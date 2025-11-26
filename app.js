/* app.js
   Chrome(Android) 最適化版
   - ピンチズーム / ドラッグ / 回転 / 初期画像 / 自分画像
   - ユーザー画像は URL.createObjectURL で保持
   - 全画面時は編集を無効化（固定）
   - 全画面中のタップで下部に解除ボタンを2秒表示、押下で解除
*/

const img = document.getElementById('image');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const initialBtn = document.getElementById('initialBtn');
const userBtn = document.getElementById('userBtn');
const rotateBtn = document.getElementById('rotateBtn');
const resetBtn = document.getElementById('resetBtn');
const fileInput = document.getElementById('fileInput');
const exitBtn = document.getElementById('exitFullscreenBtn');

const initialImagePath = 'images/sample1.jpg';

// transform state
let scale = 1;
let rotationDeg = 0;
let posX = 0;
let posY = 0;

// touch state
let startDist = 0;
let startScale = 1;
let startTouch = null;
let startPos = {x:0,y:0};

// scale bounds
const MIN_SCALE = 0.5;
const MAX_SCALE = 4.0;

// exit button timer
let exitTimer = null;

/* apply transform */
function applyTransform() {
  img.style.transform = `translate(${posX}px, ${posY}px) scale(${scale}) rotate(${rotationDeg}deg)`;
}

/* load initial image on start */
img.src = initialImagePath;

/* ------------- user image handling ------------- */
let userImageURL = null; // object URL

fileInput.addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;

  // 古い object URL があれば解放
  if (userImageURL) {
    URL.revokeObjectURL(userImageURL);
    userImageURL = null;
  }

  userImageURL = URL.createObjectURL(f);
  img.src = userImageURL;
});

// switch to initial image
initialBtn.addEventListener('click', () => {
  img.src = initialImagePath;
});

// switch to user image
userBtn.addEventListener('click', () => {
  if (userImageURL) {
    img.src = userImageURL;
  } else {
    img.src = initialImagePath;
  }
});

/* ------------- rotation / reset ------------- */
rotateBtn.addEventListener('click', () => {
  rotationDeg = (rotationDeg + 90) % 360;
  applyTransform();
});

resetBtn.addEventListener('click', () => {
  scale = 1;
  rotationDeg = 0;
  posX = 0;
  posY = 0;
  applyTransform();
});

/* ------------- touch handlers (editing mode only) ------------- */
function getDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

img.addEventListener('touchstart', (e) => {
  if (document.fullscreenElement) return; // fixed mode
  if (e.touches.length === 2) {
    startDist = getDistance(e.touches);
    startScale = scale;
  } else if (e.touches.length === 1) {
    startTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    startPos = { x: posX, y: posY };
  }
}, { passive: true });

img.addEventListener('touchmove', (e) => {
  if (document.fullscreenElement) return; // fixed mode
  if (e.touches.length === 2) {
    const dist = getDistance(e.touches);
    const newScale = startScale * (dist / startDist);
    scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, newScale));
    applyTransform();
  } else if (e.touches.length === 1 && startTouch) {
    const dx = e.touches[0].clientX - startTouch.x;
    const dy = e.touches[0].clientY - startTouch.y;
    posX = startPos.x + dx;
    posY = startPos.y + dy;
    applyTransform();
  }
}, { passive: false });

img.addEventListener('touchend', (e) => {
  if (e.touches.length === 0) {
    startTouch = null;
  } else if (e.touches.length === 1) {
    startTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    startPos = { x: posX, y: posY };
  }
});

/* Basic mouse support for desktop testing */
let dragging = false, mouseStart = {x:0,y:0}, mouseStartPos = {x:0,y:0};
img.addEventListener('mousedown', (e) => {
  if (document.fullscreenElement) return;
  dragging = true;
  mouseStart = { x: e.clientX, y: e.clientY };
  mouseStartPos = { x: posX, y: posY };
  e.preventDefault();
});
document.addEventListener('mousemove', (e) => {
  if (!dragging) return;
  posX = mouseStartPos.x + (e.clientX - mouseStart.x);
  posY = mouseStartPos.y + (e.clientY - mouseStart.y);
  applyTransform();
});
document.addEventListener('mouseup', () => { dragging = false; });

/* ------------- fullscreen handling (Chrome optimized) ------------- */
fullscreenBtn.addEventListener('click', async () => {
  try {
    await document.documentElement.requestFullscreen();
    document.body.classList.add('fullscreen-mode');
    requestAnimationFrame(() => applyTransform());
    showExitBtnTemporarily();
  } catch (err) {}
});

document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    document.body.classList.remove('fullscreen-mode');
    hideExitBtnImmediate();
  } else {
    document.body.classList.add('fullscreen-mode');
    requestAnimationFrame(() => applyTransform());
  }
});

/* ------------- exit button logic ------------- */
function showExitBtnTemporarily() {
  exitBtn.classList.add('show');
  if (exitTimer) { clearTimeout(exitTimer); exitTimer = null; }
  exitTimer = setTimeout(() => {
    exitBtn.classList.remove('show');
    exitTimer = null;
  }, 2000);
}

function hideExitBtnImmediate() {
  if (exitTimer) { clearTimeout(exitTimer); exitTimer = null; }
  exitBtn.classList.remove('show');
}

document.addEventListener('touchstart', (e) => {
  if (!document.fullscreenElement) return;
  showExitBtnTemporarily();
}, { passive: true });

exitBtn.addEventListener('click', async () => {
  if (document.fullscreenElement) {
    try { await document.exitFullscreen(); } catch {}
  }
  hideExitBtnImmediate();
});

/* ------------- image load & resize safety ------------- */
img.addEventListener('load', () => {
  requestAnimationFrame(() => applyTransform());
});
window.addEventListener('resize', () => {
  requestAnimationFrame(() => applyTransform());
});

/* ------------- service worker registration ------------- */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(()=>{});
}
