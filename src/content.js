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

let stickyExists = false; // 标记面板是否存在

function toggleStickyPanel() {
  // 如果面板已存在，移除它
  if (stickyExists) {
    const stickyPanel = document.getElementById("sticky-panel");
    if (stickyPanel) stickyPanel.remove();
    stickyExists = false;
    return;
  }

  // 标记为已创建，防止重复触发
  stickyExists = true;

  // 使用 fetch 加载 sticky.html
  fetch(chrome.runtime.getURL("src/sticky.html"))
    .then((response) => response.text())
    .then((html) => {
      // 检查是否面板已经存在（防止异步加载完成后重复创建）
      if (document.getElementById("sticky-panel")) {
        stickyExists = false; // 恢复标记
        return;
      }

      // 创建 Sticky 面板容器
      const stickyPanel = document.createElement("div");
      stickyPanel.id = "sticky-panel";

      // 插入 HTML 内容
      stickyPanel.innerHTML = html;

      // 动态加载 CSS 文件
      fetchAndInjectCSS();

      // 动态设置图片路径
      const logoImg = stickyPanel.querySelector("#logo img");
      if (logoImg) {
        logoImg.src = chrome.runtime.getURL("icon.png");
      }

      // 添加关闭按钮事件
      const closeButton = stickyPanel.querySelector("#close-sticky");
      if (closeButton) {
        closeButton.addEventListener("click", () => {
          stickyPanel.remove();
          stickyExists = false; // 重置标记
        });
      }

      // 添加点击面板打开 popup 的事件
      stickyPanel.addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "open-popup" });
      });

      // 添加拖动功能
      makeDraggable(stickyPanel);

      // 将面板插入到页面
      document.body.appendChild(stickyPanel);
    })
    .catch((error) => {
      console.error("Failed to load sticky.html:", error);
      stickyExists = false; // 如果加载失败，重置标记
    });
}

// 动态加载 CSS 文件并插入到 <style> 中
function fetchAndInjectCSS() {
  fetch(chrome.runtime.getURL("src/sticky.css"))
    .then((response) => response.text())
    .then((cssContent) => {
      const existingStyle = document.getElementById("sticky-style");
      if (existingStyle) return; // 防止重复插入

      const style = document.createElement("style");
      style.id = "sticky-style"; // 设置一个 ID 方便管理
      style.textContent = cssContent; // 将 CSS 内容插入到 <style> 中
      document.head.appendChild(style); // 将 <style> 添加到页面
    })
    .catch((error) => {
      console.error("Failed to load sticky.css:", error);
    });
}

// 实现拖动功能（仅允许上下拖动）
function makeDraggable(panel) {
  const dragHandle = panel.querySelector("#drag-handle");
  let isDragging = false;
  let offsetY = 0;

  dragHandle.addEventListener("mousedown", (event) => {
    isDragging = true;
    offsetY = event.clientY - panel.getBoundingClientRect().top;
    dragHandle.style.cursor = "grabbing"; // 改变鼠标样式
    event.preventDefault();
  });

  document.addEventListener("mousemove", (event) => {
    if (isDragging) {
      const newY = event.clientY - offsetY;

      // 限制上下移动范围
      panel.style.top = `${Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, newY))}px`;
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
    dragHandle.style.cursor = "grab"; // 恢复鼠标样式
  });
}

// 监听来自 popup.js 或 background.js 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getImages") {
    // 抓取图片
    const images = getAllImages();
    const origin = window.location.origin; // 获取当前网页的 origin
    sendResponse({ images, origin }); // 回传图片和 origin
  }
  if (message.action === "toggle-sticky") {
    // 切换 Sticky 面板
    toggleStickyPanel();
  }
  if (message.action === "open-popup") {
    chrome.windows.create({
      url: chrome.runtime.getURL("popup.html"),
      type: "popup",
      width: 400,
      height: 600,
    });
  }
});
