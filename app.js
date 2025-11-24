let initialImageSrc = "images/sample1.jpg";
let userImageSrc = null; // ユーザー画像は未読み込み
let rotation = 0;
let scale = 1;

const mainImage = document.getElementById("mainImage");
const fileInput = document.getElementById("fileInput");

// 回転
document.getElementById("rotate").addEventListener("click", () => {
    rotation = (rotation + 90) % 360;
    updateTransform();
});

// 初期配置（リセット）
document.getElementById("reset").addEventListener("click", () => {
    rotation = 0;
    scale = 1;
    updateTransform();
});

// 全画面
document.getElementById("fullscreen").addEventListener("click", () => {
    if (mainImage.requestFullscreen) {
        mainImage.requestFullscreen();
    }
});

// 初期画像切替
document.getElementById("initialImage").addEventListener("click", () => {
    mainImage.src = initialImageSrc;
    rotation = 0;
    scale = 1;
    updateTransform();
});

// 自分画像切替
document.getElementById("userImage").addEventListener("click", () => {
    if (userImageSrc) {
        mainImage.src = userImageSrc;
    } else {
        mainImage.src = initialImageSrc;
    }
    rotation = 0;
    scale = 1;
    updateTransform();
});

// 画像選択
fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
        const url = URL.createObjectURL(file);
        userImageSrc = url;
        mainImage.src = url;
        rotation = 0;
        scale = 1;
        updateTransform();
        cacheImage(file);
    }
});

// 画像キャッシュ（Service Workerを使用）
async function cacheImage(file) {
    const cache = await caches.open("image-viewer-cache-v1");
    const response = await fetch(URL.createObjectURL(file));
    await cache.put("/current-user-image", response);
}

function updateTransform() {
    mainImage.style.transform = `rotate(${rotation}deg) scale(${scale})`;
}

// ピンチズーム対応（簡易）
let startDist = 0;
mainImage.addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) {
        startDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
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
    }
});
