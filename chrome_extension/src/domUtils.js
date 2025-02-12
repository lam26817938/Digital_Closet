let stickyExists = false; // 标记面板是否存在
let isDragging = false; // 重置拖动状态

function toggleStickyPanel(frompopup=false) {
  const floatPanel = document.getElementById("floating-window");

  // 如果浮动窗口存在，先关闭浮动窗口
  if (floatPanel) {
    floatPanel.remove();
    stickyExists = false;
    return;
  }
  
  // 如果面板已存在，移除它
  if (stickyExists && !frompopup) {
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

      const closeButton = stickyPanel.querySelector("#close-sticky");
      if (closeButton) {
        closeButton.addEventListener("click", (event) => {
          event.stopPropagation(); // 阻止冒泡
          stickyPanel.remove();
          stickyExists = false; // 重置标记
        });
      }

      // 修改 click 事件监听
      stickyPanel.addEventListener("click", (event) => {
        if (!isDragging) { // 只有非拖动时才处理 click 事件
          if (
            event.target.id === "sticky-panel" || 
            event.target.closest("#sticky-panel") && 
            !event.target.closest("#drag-handle") && 
            !event.target.closest("#close-sticky")
          ) {
            togglefloat();
          }
        }
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

// 实现拖动功能（仅允许上下拖动）
function makeDraggable(panel) {
    const dragHandle = panel.querySelector("#drag-handle");
    let offsetY = 0;
  
    dragHandle.addEventListener("mousedown", (event) => {
      isDragging = true; // 开始拖动
      offsetY = event.clientY - panel.getBoundingClientRect().top;
      dragHandle.style.cursor = "grabbing"; // 改变鼠标样式
      event.stopPropagation();
      event.preventDefault();
    });
  
    document.addEventListener("mousemove", (event) => {
      if (isDragging) {
        const newY = event.clientY - offsetY;
        panel.style.top = `${Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, newY))}px`;
      }
    });
  
    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false; // 拖动结束
        dragHandle.style.cursor = "grab"; // 恢复鼠标样式
      }
    });
  }
// 更新右側結果區域的方法
function updateResultDisplay(results, isMultiple = false) {
  const resultDisplay = document.getElementById('result-display');
  if (!resultDisplay) {
    console.error('Element not found: #result-display');
    return;
  }

  // 清空現有內容
  resultDisplay.innerHTML = '';

  if (isMultiple) {
    // 插入多個結果
    results.forEach(result => {
      const resultContainer = document.createElement('div');
      resultContainer.style.display = 'flex';
      resultContainer.style.alignItems = 'center';
      resultContainer.style.marginBottom = '10px';
      
      const imgElement = document.createElement('a');
      imgElement.href = result.link;
      imgElement.target = '_blank';
      const img = document.createElement('img');
      img.src = result.thumbnail;
      img.alt = 'Result Image';
      img.style.maxWidth = '100px';
      img.style.marginRight = '10px'; // 與品牌名之間的間距
      imgElement.appendChild(img);
      
      const detailsContainer = document.createElement('div');
      detailsContainer.style.display = 'flex';
      detailsContainer.style.flexDirection = 'column';
      detailsContainer.style.alignItems = 'flex-start';
      
      const brandElement = document.createElement('a');
      brandElement.href = result.link;
      brandElement.textContent = result.retail;
      brandElement.style.marginBottom = '10px'; // 與按鈕之間的間距
      brandElement.target = '_blank';
      
      const pickButton = document.createElement('button');
      pickButton.textContent = 'Pick';
      pickButton.style.marginTop = '10px'; // 與品牌名之間的間距
      pickButton.addEventListener('click', () => {
        const selectedImage = document.querySelector('#clothes-selection img.selected');
        if (!selectedImage) {
          alert('請先選擇一張圖片！');
          return;
        }
      
        const selectedImageName = new URL(selectedImage.src).pathname.split('/').pop();
      
        fetch('http://127.0.0.1:8000/save_json', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ result: result, selected_image_name: selectedImageName }),
        })
        .then(response => response.json())
        .then(() => {
          updateFloatingContent(); // 成功後執行 updateFloatingContent
        })
        .catch(error => {
          console.error('Error saving image:', error);
        });
      });
      
      detailsContainer.appendChild(brandElement);
      detailsContainer.appendChild(pickButton); // 將按鈕放在品牌名下面
      
      resultContainer.appendChild(imgElement);
      resultContainer.appendChild(detailsContainer);
      
      resultDisplay.appendChild(resultContainer);
    });
  } else {
    // 只顯示一張圖片結果
    const imgElement = document.createElement('img');
    imgElement.src = results;
    imgElement.alt = 'Result Image';
    imgElement.style.maxWidth = '100%';
    imgElement.style.maxHeight = '100%';
    imgElement.style.objectFit = 'contain';

    resultDisplay.appendChild(imgElement);
  }
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