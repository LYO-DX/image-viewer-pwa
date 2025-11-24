let initialImageSrc = "images/sample1.jpg";
let userImageSrc = null;
let rotation = 0;
let scale = 1;
let translateX = 0;
let translateY = 0;

const mainImage = document.getElementById("mainImage");
const fileInput = document.getElementById("fileInput");
const exitBtn = document.getElementById("exitFullscreen");
let exitTimeout = null;

// 回転
document.getElementById("rotate").addEventListener("click", () => {
    rotation = (rotation + 90) % 360;
    updateTransform();
});

// 初期配置（リセット）
document.getElementById("reset").addEventListener("click", () => {
    rotation = 0;
    scale = 1;
    translateX = 0;
    translateY = 0;
    updateTransform();
});

// 全画面
document.getElementById("fullscreen").addEventListener("click", async () => {
    if (mainImage.requestFullscreen) {
        await mainImage.requestFullscreen();
        showExitButton();
    }
});

// 初期画像切替
document.getElementById("initialImage").addEventListener("click", () => {
    mainImage.src = initialImageSrc;
});

// 自分画像切替
document.getElementById("userImage").addEventListener("click", () => {
    mainImage.src = userImageSrc ? userImageSrc : initialImageSrc;
});

// 画像選択
fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        userImageSrc = url;
        mainImage.src = url;
        cacheImage(file);
    }
});

// キャッシュ
async function cacheImage(file) {
    const cache = await caches.open("image-viewer-cache-v1");
    const response = await fetch(URL.createObjectURL(file));
    await cache.put("/current-user-image", response);
}

// 全画面解除ボタン
function showExitButton() {
    exitBtn.style.opacity = 1;
    if (exitTimeout) clearTimeout(exitTimeout);
    exitTimeout = setTimeout(() => {
        exitBtn.style.opacity = 0;
    }, 2000);
}

exitBtn.addEventListener("click", () => {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }
    exitBtn.style.opacity = 0;
    if (exitTimeout) clearTimeout(exitTimeout);
});

// 画面タップで表示
mainImage.addEventListener("click", () => {
    if (document.fullscreenElement) showExitButton();
});

// ピンチズーム + 移動保持
let startDist = 0;
let startX = 0, startY = 0, origX = 0, origY = 0;

mainImage.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
        startDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
    } else if (e.touches.length === 1) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        origX = translateX;
        origY = translateY;
    }
});

mainImage.addEventListener("touchmove", (e) => {
    if (e.touches.length === 2) {
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        scale *= dist / startDist;
        scale = Math.min(Math.max(scale, 0.5), 3);
        startDist = dist;
        updateTransform();
    } else if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        translateX = origX + dx;
        translateY = origY + dy;
        updateTransform();
