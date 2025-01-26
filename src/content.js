// 定義抓取圖片的邏輯
function getAllImages() {
  const allImages = new Set();

  // 1. 抓取所有 <img> 元素
  document.querySelectorAll("img").forEach((img) => {
    const src =
      img.src || img.getAttribute("data-src") || img.getAttribute("data-lazy") ||
      img.getAttribute("data-srcset") || img.getAttribute("data-original");
    if (src && !isBase64Image(src)) {
      allImages.add(relativeUrlToAbsolute(src)); // 轉換為絕對路徑
    }
  });

  // 2. 抓取所有 CSS background-image 的圖片
  document.querySelectorAll("*").forEach((el) => {
    const style = window.getComputedStyle(el);
    const bgImage = style.backgroundImage;
    if (bgImage && bgImage.startsWith("url(")) {
      const url = bgImage.slice(4, -1).replace(/["']/g, ""); // 提取背景圖片 URL
      if (url) {
        allImages.add(relativeUrlToAbsolute(url)); // 轉換為絕對路徑
      }
    }
  });

  // 3. 抓取所有 <a> 元素的圖片 URL
  document.querySelectorAll("a").forEach((a) => {
    const href = a.href;
    if (isImageURL(href)) {
      allImages.add(relativeUrlToAbsolute(href)); // 轉換為絕對路徑
    }
  });

  // 返回去重後的圖片列表
  return [...allImages];
}

// 判斷是否是圖片 URL
function isImageURL(url) {
  const imageUrlRegex = /\.(bmp|gif|ico|jfif|jpe?g|png|svg|tiff?|webp)$/i;
  return url && (url.startsWith("data:image") || imageUrlRegex.test(url));
}

// 判斷是否是 Base64 圖片
function isBase64Image(url) {
  return url.startsWith("data:image");
}

// 將相對 URL 轉換為絕對 URL
function relativeUrlToAbsolute(url) {
  return url.startsWith("/") ? `${window.location.origin}${url}` : url;
}

// 監聽來自 popup.js 的請求
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getImages") {
    const images = getAllImages(); // 抓取圖片
    const origin = window.location.origin; // 獲取當前網頁的 origin
    sendResponse({ images, origin }); // 將圖片和 origin 一併回傳
  }
});
