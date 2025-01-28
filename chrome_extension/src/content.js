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
  return url.startsWith("data:image") || url.startsWith("chrome-extension://");
}

// 將相對 URL 轉換為絕對 URL
function relativeUrlToAbsolute(url) {
  return url.startsWith("/") ? `${window.location.origin}${url}` : url;
}

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

function togglefloat() {
  const stickyPanel = document.getElementById("sticky-panel");

  if (stickyPanel) {
    stickyPanel.remove(); // 关闭 Sticky 面板
    stickyExists = false; // 更新状态
  }

  // 检查页面是否已存在浮动窗口，避免重复插入
  if (document.getElementById("floating-window")) {
    return;
  }

  // 创建浮动窗口的主容器
  const popupContainer = document.createElement("div");
  popupContainer.id = "floating-window";

  // 加载 float.html 的内容
  fetch(chrome.runtime.getURL("src/float.html"))
    .then((response) => response.text())
    .then((html) => {
      popupContainer.innerHTML = html;
      fetchfloatCSS();
      updateFloatingContent();
      updateModelPhoto()

      const closeButton = popupContainer.querySelector("#close-floating-window");
      if (closeButton) {
        closeButton.addEventListener("click", () => {
          popupContainer.remove(); // 移除浮动窗口
          toggleStickyPanel(); // 重新打开 Sticky 面板
        });
      }

      document.body.appendChild(popupContainer);
    })
    .catch((error) => {
      console.error("Failed to load float.html:", error);
    });
}


function fetchfloatCSS() {
  fetch(chrome.runtime.getURL("src/float.css"))
    .then((response) => response.text())
    .then((cssContent) => {
      const existingStyle = document.getElementById("float-style");
      if (existingStyle) return;
      const style = document.createElement("style");
      style.id = "float-style";
      style.textContent = cssContent;
      document.head.appendChild(style);
    })
    .catch((error) => {
      console.error("Failed to load float.css:", error);
    });
}

  
  // 更新浮動視窗的內容
function updateFloatingContent() {
  fetch('http://127.0.0.1:8000/inference')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }
      return response.json();
    })
    .then((data) => {
      const floatingContent = document.getElementById('clothes-selection');
      floatingContent.innerHTML = ''; // 清空原内容

      // 动态添加图片
      data.images.forEach((imageUrl) => {
        const imgElement = document.createElement('img');
        imgElement.src = imageUrl;
        imgElement.style.maxWidth = '80px';
        imgElement.style.margin = '10px';

        imgElement.addEventListener('click', () => {
          document.querySelectorAll('#clothes-selection img.selected').forEach((img) => {
            img.classList.remove('selected');
          });
          imgElement.classList.add('selected');
          tryOnButton.disabled = false;
        });


        floatingContent.appendChild(imgElement);
      });
    // 试穿按钮点击事件
    const tryOnButton = document.getElementById('try-on-button');
    tryOnButton.addEventListener('click', () => {
      const selectedImages = Array.from(document.querySelectorAll('#clothes-selection img.selected'))
        .map((img) => img.src);

      if (selectedImages.length === 0) {
        alert('At least choose one!');
        return;
      }

      handleTryOn();

    });
    const nextPoseButton = document.getElementById('next-pose-button');

    if (nextPoseButton) {
      nextPoseButton.addEventListener('click', handleNextPose);
    }
    })
    .catch((error) => {
      console.error('Error:', error);
      alert('Error occurred while updating images.');
    });

}

function updateModelPhoto() {
  fetch('http://127.0.0.1:8000/model')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch model image');
      }
      return response.json();
    })
    .then((data) => {
      const modelPhotoContainer = document.getElementById('model-photo-container');

      if (!modelPhotoContainer) {
        console.error('Element not found: #model-photo-container');
        return;
      }

      // 清空 model 区域，避免重复插入
      modelPhotoContainer.innerHTML = '';

      // 创建并插入图片
      const imgElement = document.createElement('img');
      imgElement.src = data.images; // API 返回的图片 URL
      imgElement.alt = "Model Photo";
      imgElement.style.maxWidth = '100%';
      imgElement.style.maxHeight = '100%';
      imgElement.style.objectFit = 'contain';

      modelPhotoContainer.appendChild(imgElement);
    })
    .catch((error) => {
      console.error('Error:', error);
      alert('Error occurred while fetching model image.');
    });
}

let tryon_result = '';

// 处理 Try On 按钮点击事件
function handleTryOn() {
  const selectedImage = document.querySelector('#clothes-selection img.selected'); // 获取选中的图片
  if (!selectedImage) {
    alert('请先选择一张图片进行试穿！');
    return;
  }

  document.getElementById('loading-spinner').classList.remove('hidden');

  // 调用 `/tryon` API
  fetch('http://127.0.0.1:8000/tryon', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref_image_path: selectedImage.src }), // 传递选中的图片路径
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to process try-on');
      }
      return response.json();
    })
    .then((data) => {
      // 更新右侧结果区域
      updateResultDisplay(data.generated_image);
      tryon_result = data.generated_image;
      document.getElementById("next-pose-button").disabled = false;
    })
    .catch((error) => {
      console.error('Error:', error);
      alert('试穿失败，请稍后重试！');
      document.getElementById("next-pose-button").disabled = true;
    }).finally(() => {
      document.getElementById('loading-spinner').classList.add('hidden');
    });
}

// 处理 Next Pose 按钮点击事件
function handleNextPose() {
  // 调用 `/pose` API
  const resultImage = document.querySelector('#result-display img');

  if (!resultImage) {
    alert("请先进行试穿，然后再尝试更换姿势！");
    return;
  }

  const currentResultUrl = tryon_result;

  document.getElementById('loading-spinner').classList.remove('hidden');

  fetch('http://127.0.0.1:8000/pose', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref_image_path: currentResultUrl }), // 发送当前图片 URL
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch pose image');
      }
      return response.json();
    })
    .then((data) => {
      // 更新右侧结果区域
      updateResultDisplay(data.generated_image);
    })
    .catch((error) => {
      console.error('Error:', error);
      alert('获取姿势失败，请稍后重试！');
    })
    .finally(() => {
      document.getElementById('loading-spinner').classList.add('hidden');
    });
}

// 更新右侧结果区域的方法
function updateResultDisplay(imageUrl) {
  const resultDisplay = document.getElementById('result-display');
  if (!resultDisplay) {
    console.error('Element not found: #result-display');
    return;
  }

  // 清空现有内容
  resultDisplay.innerHTML = '';

  // 插入新的图片
  const imgElement = document.createElement('img');
  imgElement.src = imageUrl;
  imgElement.alt = 'Generated Result';
  imgElement.style.maxWidth = '100%';
  imgElement.style.maxHeight = '100%';
  imgElement.style.objectFit = 'contain';

  resultDisplay.appendChild(imgElement);
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
    toggleStickyPanel(true);
  }
  if (message.action === "toggle-float") {
    // 切换 Sticky 面板
    togglefloat();
  }
});
