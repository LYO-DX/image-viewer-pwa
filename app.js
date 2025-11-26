/* app.js
   Chrome（Android）向けに最適化済み
   - 編集モード: ピンチズーム / ドラッグ / 回転 / 初期配置 / 画像読み込み
   - 固定モード(全画面): 操作無効、1タップで下部に解除ボタンを2秒表示、押すと解除
   - 読み込んだユーザー画像は service worker のキャッシュに "/current-user-image" として保存
*/

/* 要素 */
const img = document.getElementById('image');
const fullscreenBtn = document.getElementById('fullscreenBtn');
const rotateBtn = document.getElementById('rotateBtn');
const resetBtn = document.getElementById('resetBtn');
const initialBtn = document.getElementById('initialBtn');
const userBtn = document.getElementById('userBtn');
const fileInput = document.getElementById('fileInput');
const exitBtn = document.getElementById('exitFullscreenBtn');

const initialImagePath = 'images/sample1.jpg';

/* 状態 */
let userImageURL = null; // blob URL (optional), but we will use cache path '/current-user-image'
let scale = 1;
let rotation = 0; // degrees
let posX = 0; // px
let posY = 0; // px

/* touch state */
let startDist = 0;
let startScale = 1;
let startTouch = null;
let startPos = { x: 0, y: 0 };

/* bounds for scale */
const MIN_SCALE = 0.5;
const MAX_SCALE = 4.0;

/* exit button timer */
let exitTimer = null;

/* Apply transform consistently */
function applyTransform() {
  img.style.transform = `translate(${posX}px, ${posY}px) scale(${scale}) rotate(${rotation}deg)`;
}

/* ----------------------------
   Image switching & caching
   ---------------------------- */

/* Set initial or cached image on load */
function setInitialImage() {
  img.src = initialImagePath;
}

/* When user selects file, store it in cache as '/current-user-image' and set src to that path */
fileInput.addEventListener('change', async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    // Put file into Cache Storage at key '/current-user-image'
    const cache = await caches.open('image-viewer-cache-v1');
    const response = new Response(file, { headers: { 'Content-Type': file.type || 'image/*' } });
    await cache.put('/current-user-image', response);
    // Use the cache URL as the src - service worker will serve it
    userImageURL = '/current-user-image';
    img.src = userImageURL;
  } catch (err) {
    // Fallback to object URL if cache put fails
    if (userImageURL) {
      try { URL.revokeObjectURL(userImageURL); } catch {}
    }
    userImageURL = URL.createObjectURL(file);
    img.src = userImageURL;
  }
});

/* Buttons to switch images */
initialBtn.addEventListener('click', () => {
  img.src = initialImagePath;
});

userBtn.addEventListener('click', async () => {
  if (userImageURL) {
    img.src = userImageURL;
  } else {
    img.src = initialImagePath;
  }
});

/* ----------------------------
   rotation and reset
   ---------------------------- */
rotateBtn.addEventListener('click', () => {
  rotation = (rotation + 90) % 360;
  applyTransform();
});

resetBtn.addEventListener('click', () => {
  scale = 1;
  rotation = 0;
  posX = 0;
  posY = 0;
  applyTransform();
});

/* ----------------------------
   Touch interactions (editing mode)
   ---------------------------- */
function getDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

/* touchstart */
img.addEventListener('touchstart', (e) => {
  // If in full screen (fixed mode) => ignore editing gestures
  if (document.fullscreenElement) return;

  if (e.touches.length === 2) {
    startDist = getDistance(e.touches);
    startScale = scale;
  } else if (e.touches.length === 1) {
    startTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    startPos = { x: posX, y: posY };
  }
}, { passive: true });

/* touchmove */
img.addEventListener('touchmove', (e) => {
  if (document.fullscreenElement) return;

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

/* touchend: reset startTouch when fingers lifted */
img.addEventListener('touchend', (e) => {
  if (e.touches.length === 0) {
    startTouch = null;
  } else if (e.touches.length === 1) {
    // continue panning with remaining finger
    startTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    startPos = { x: posX, y: posY };
  }
});

/* Basic mouse support for desktop testing */
let dragging = false;
let mouseStart = { x: 0, y: 0 }, mouseStartPos = { x: 0, y: 0 };

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

/* ----------------------------
   Fullscreen handling (Chrome-optimized)
   ---------------------------- */

fullscreenBtn.addEventListener('click', async () => {
  try {
    // requestFullscreen on documentElement to get true fullscreen
    await document.documentElement.requestFullscreen();
    // mark body as fullscreen-mode to hide controls via CSS
    document.body.classList.add('fullscreen-mode');
    // Reapply transform after entering fullscreen to ensure consistency
    requestAnimationFrame(() => applyTransform());
    // show exit button briefly once
    showExitBtnTemporarily();
  } catch (err) {
    // ignore request errors
  }
});

/* When fullscreen state changes */
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement) {
    // exited fullscreen
    document.body.classList.remove('fullscreen-mode');
    // hide exit button if still shown
    hideExitBtnImmediate();
  } else {
    // entered fullscreen
    document.body.classList.add('fullscreen-mode');
    // reapply transform
    requestAnimationFrame(() => applyTransform());
  }
});

/* ----------------------------
   Exit button behavior (全画面解除)
   ---------------------------- */
function showExitBtnTemporarily() {
  exitBtn.classList.add('show');
  // clear any existing timer
  if (exitTimer) {
    clearTimeout(exitTimer);
    exitTimer = null;
  }
  exitTimer = setTimeout(() => {
    exitBtn.classList.remove('show');
    exitTimer = null;
  }, 2000);
}

function hideExitBtnImmediate() {
  if (exitTimer) { clearTimeout(exitTimer); exitTimer = null; }
  exitBtn.classList.remove('show');
}

/* Show exit button on any touch while in fullscreen */
document.addEventListener('touchstart', (e) => {
  if (!document.fullscreenElement) return;
  // show button temporarily
  showExitBtnTemporarily();
}, { passive: true });

exitBtn.addEventListener('click', async () => {
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch (err) {}
  }
  hideExitBtnImmediate();
});

/* apply transform after image load (handles source changes) */
img.addEventListener('load', () => {
  // ensure transform reapplied after layout
  requestAnimationFrame(() => applyTransform());
});

/* Reapply transform on resize as a precaution */
window.addEventListener('resize', () => {
  requestAnimationFrame(() => applyTransform());
});

/* ----------------------------
   Service Worker registration
   ---------------------------- */
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('service-worker.js').catch(()=>{});
}

/* initialize */
(function init() {
  // ensure initial image
  if (!img.src) img.src = initialImagePath;
  applyTransform();
})();
