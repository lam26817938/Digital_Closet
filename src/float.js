if (!document.getElementById('floating-window')) {
  // 加載 HTML 文件
  fetch(chrome.runtime.getURL('src/float.html'))
    .then((response) => response.text())
    .then((html) => {
      // 將 HTML 字符串轉換為 DOM 節點
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html;

      // 將節點插入到頁面
      document.body.appendChild(tempDiv.firstChild);

      // 綁定關閉按鈕事件
      document.getElementById('close-floating-window').addEventListener('click', () => {
        document.getElementById('floating-window').remove();
      });
    })
    .catch((error) => {
      console.error('Failed to load the floating window:', error);
    });
}
