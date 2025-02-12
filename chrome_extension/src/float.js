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

      const closeButton = popupContainer.querySelector("#close-button");
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
      Object.keys(data.files).forEach((key) => {
        const imageUrl = data.files[key].png;
        const jsonInfo = data.files[key].json;
      
        // 包裹图片和标签的容器
        const imageContainer = document.createElement('div');
        imageContainer.style.display = 'inline-block';
        imageContainer.style.position = 'relative';
        imageContainer.style.margin = '10px';
      
      
        const imgElement = document.createElement('img');
        imgElement.src = imageUrl;
        imgElement.style.maxWidth = '80px';
        imgElement.style.cursor = 'pointer';
        imgElement.style.display = 'block'; // 确保不会变形
      
        if (jsonInfo) {
          const tag = document.createElement('div');
          tag.style.display = 'none';
          tag.style.position = 'absolute';
          tag.style.backgroundColor = 'white';
          tag.style.border = '1px solid black';
          tag.style.padding = '5px';
          tag.style.zIndex = '1000';
          tag.style.top = '0';
          tag.style.left = '100%';
          tag.style.color = '#333'; // 修改字体颜色，使其清晰可见
      
          const thumbnail = document.createElement('img');
          const thumbnailLink = document.createElement('a');
          thumbnailLink.href = jsonInfo.link;
          thumbnailLink.target = '_blank';

          thumbnail.src = jsonInfo.thumbnail;
          thumbnail.style.maxWidth = '100px';
          thumbnail.style.display = 'block';
          
          thumbnailLink.appendChild(thumbnail); // 確保將縮略圖添加到超連結中
      
          // 让品牌名也是可点击的超链接
          const retail = document.createElement('a');
          retail.href = jsonInfo.link;
          retail.textContent = jsonInfo.retail;
          retail.target = '_blank'; // 新增這行，使連結在新標籤頁中打開
          retail.style.color = '#333'; // 让文字颜色变深
          retail.style.display = 'block';
          retail.style.fontWeight = 'bold';
      
          tag.appendChild(thumbnailLink); // 確保將超連結添加到標籤中
          tag.appendChild(retail);
      
          // 鼠标悬停时显示标签
          imageContainer.addEventListener('mouseenter', () => {
            tag.style.display = 'block';
          });
      
          imageContainer.addEventListener('mouseleave', () => {
            tag.style.display = 'none';
          });
      
          imageContainer.appendChild(tag);

          // 添加標記到圖片上，表示有資料
          const infoMarker = document.createElement('span');
          infoMarker.textContent = '🔍'; // 使用放大鏡符號作為標記
          infoMarker.style.position = 'absolute';
          infoMarker.style.top = '5px';
          infoMarker.style.right = '5px';
          infoMarker.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
          infoMarker.style.borderRadius = '50%';
          infoMarker.style.padding = '2px';
          infoMarker.style.fontSize = '12px';
          infoMarker.style.zIndex = '1001';
          imageContainer.appendChild(infoMarker);
        }
      
        imgElement.addEventListener('click', () => {
          document.querySelectorAll('#clothes-selection img.selected').forEach((img) => {
            img.classList.remove('selected');
          });
          imgElement.classList.add('selected');
          document.getElementById('try-on-button').disabled = false;
          document.getElementById('identify-button').disabled = false;
        });
      
        imageContainer.appendChild(imgElement); // 把链接添加进容器
        floatingContent.appendChild(imageContainer);
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

        tryOnButton.disabled = true;
        handleTryOn().finally(() => {
          tryOnButton.disabled = false;
        });
      });

      const nextPoseButton = document.getElementById('next-pose-button');
      if (nextPoseButton) {
        nextPoseButton.addEventListener('click', () => {
          nextPoseButton.disabled = true;
          handleNextPose().finally(() => {
            nextPoseButton.disabled = false;
          });
        });
      }

      // Identify 按鈕點擊事件
      const identifyButton = document.getElementById('identify-button');
      identifyButton.addEventListener('click', () => {
        identifyButton.disabled = true;
        handleIdentify().finally(() => {
          identifyButton.disabled = false;
        });
      });
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
async function handleTryOn() {
  const selectedImage = document.querySelector('#clothes-selection img.selected'); // 获取选中的图片
  if (!selectedImage) {
    alert('请先选择一张图片进行试穿！');
    return;
  }

  document.getElementById('loading-spinner').classList.remove('hidden');

  try {
    // 调用 `/tryon` API
    const response = await fetch('http://127.0.0.1:8000/tryon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref_image_path: selectedImage.src }), // 传递选中的图片路径
    });

    if (!response.ok) {
      throw new Error('Failed to process try-on');
    }

    const data = await response.json();
    // 更新右侧结果区域
    updateResultDisplay(data.generated_image);
    tryon_result = data.generated_image;
    document.getElementById("next-pose-button").disabled = false;
  } catch (error) {
    console.error('Error:', error);
    alert('试穿失败，请稍后重试！');
    document.getElementById("next-pose-button").disabled = true;
  } finally {
    document.getElementById('loading-spinner').classList.add('hidden');
  }
}

// 处理 Next Pose 按钮点击事件
async function handleNextPose() {
  // 调用 `/pose` API
  const resultImage = document.querySelector('#result-display img');

  if (!resultImage) {
    alert("请先进行试穿，然后再尝试更换姿势！");
    return;
  }

  const currentResultUrl = tryon_result;

  document.getElementById('loading-spinner').classList.remove('hidden');

  try {
    const response = await fetch('http://127.0.0.1:8000/pose', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ref_image_path: currentResultUrl }), // 发送当前图片 URL
    });

    if (!response.ok) {
      throw new Error('Failed to fetch pose image');
    }

    const data = await response.json();
    // 更新右侧结果区域
    updateResultDisplay(data.generated_image);
  } catch (error) {
    console.error('Error:', error);
    alert('获取姿势失败，请稍后重试！');
  } finally {
    document.getElementById('loading-spinner').classList.add('hidden');
  }
}

// 處理 Identify 按鈕點擊事件
async function handleIdentify() {
  const selectedImage = document.querySelector('#clothes-selection img.selected'); // 獲取選中的圖片
  if (!selectedImage) {
    alert('請先選擇一張圖片進行識別！');
    return;
  }

  document.getElementById('loading-spinner').classList.remove('hidden');

  try {
    // 調用 `/get_match` API
    const response = await fetch(`http://127.0.0.1:8000/get_match?url=${encodeURIComponent(selectedImage.src)}`);

    if (!response.ok) {
      throw new Error('Failed to identify image');
    }

    const data = await response.json();
    // 更新右側結果區域，顯示多個結果
    updateResultDisplay(data.results, true);
  } catch (error) {
    console.error('Error:', error);
    alert('識別失敗，請稍後重試！');
  } finally {
    document.getElementById('loading-spinner').classList.add('hidden');
  }
}
