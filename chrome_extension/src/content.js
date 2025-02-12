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
    toggleStickyPanel(true);
  }
  if (message.action === "toggle-float") {
    // 切换 Sticky 面板
    togglefloat();
  }
});
