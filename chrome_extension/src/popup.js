// import ./setReferer.js

document.addEventListener('DOMContentLoaded', () => {
  let totalImages = 0; // 總圖片數量

  // 抓取圖片邏輯
  function fetchImages() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: 'getImages' },
        (response) => {
          if (response && response.images) {
            totalImages = response.images.length; // 設置圖片總數
            displayImages(response.images);
            updateStatus(); // 初始化顯示狀態
          }
        }
      );
      chrome.tabs.sendMessage(tabs[0].id, { action: "toggle-sticky" });
    });
  }

  // 顯示圖片到頁面
  function displayImages(images) {
    const container = document.getElementById('image-container');
    container.innerHTML = ''; // 清空旧内容
  
    images.forEach((src) => {
      // 创建图片容器
      const imgWrapper = document.createElement('div');
      imgWrapper.style.position = 'relative'; // 确保按钮绝对定位有效
  
      // 创建图片元素
      const img = document.createElement('img');
      img.src = encodeURI(src);
      img.style.margin = '5px';
  
      // 点击图片进行选中
      img.addEventListener('click', () => {
        img.classList.toggle('selected');
        updateStatus(); // 更新选中状态
      });
  
      // 创建操作按钮容器
      const actions = document.createElement('div');
      actions.classList.add('image-actions');
  
      // 下载按钮
      const downloadButton = document.createElement('button');
      downloadButton.textContent = 'Download';
      downloadButton.addEventListener('click', (e) => {
        e.stopPropagation(); // 防止触发图片选中
        const link = document.createElement('a');
        link.href = img.src;
        link.download = 'image.jpg'; // 自定义下载文件名
        link.click();
      });
  
      // 打开按钮
      const openButton = document.createElement('button');
      openButton.textContent = 'Open';
      openButton.addEventListener('click', (e) => {
        e.stopPropagation(); // 防止触发图片选中
        window.open(img.src, '_blank');
      });
  
      actions.appendChild(downloadButton);
      actions.appendChild(openButton);
  
      // 将图片和按钮都加入图片容器
      imgWrapper.appendChild(img);
      imgWrapper.appendChild(actions);
      container.appendChild(imgWrapper);
    });
  
    updateStatus(); // 更新选中状态
  }
  

  // 更新狀態顯示（已選數量 / 總數量）
  function updateStatus() {
    const selectedCount = getSelectedCount(); // 已選數量
    const status = document.getElementById('status');
    status.textContent = `${selectedCount}/${totalImages}`; // 更新顯示文字
  }

  // 獲取已選圖片數量
  function getSelectedCount() {
    return document.querySelectorAll('#image-container img.selected').length;
  }

    // 下載選擇的圖片
  function downloadSelectedImages() {
    const selectedImages = Array.from(
      document.querySelectorAll('#image-container img.selected')
    ).map((img) => img.src);

    if (selectedImages.length === 0) {
      alert('Please select at least one image to download.');
      return;
    }

    selectedImages.forEach((src, index) => {
      const link = document.createElement('a');
      link.href = src;
      link.download = `image-${index + 1}.jpg`; // 自定義下載文件名
      link.click();
    });
  }

  function sendSelectedImages() {
    const selectedImages = Array.from(
      document.querySelectorAll('#image-container img.selected')
    );
  
    if (selectedImages.length === 0) {
      alert('Please select at least one image to send.');
      return;
    }
  
    // 顯示成功消息並立即清除選中狀態
    alert('Extracting! Please check out closet later!');
    selectedImages.forEach((img) => {
      img.classList.remove('selected');
    });
    updateStatus(); // 更新選中數量顯示
  
    // 發送請求
    const selectedImagesSrc = selectedImages.map((img) => img.src);
    fetch('http://127.0.0.1:8000/inference', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ images: selectedImagesSrc }),
    }).catch((error) => {
      console.error('Error', error);
    });
  }

  // 綁定事件
  document.getElementById('download-images').addEventListener('click', downloadSelectedImages);
  document.getElementById('send-images').addEventListener('click', sendSelectedImages);
  document.getElementById('profile-button').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tabId = tabs[0].id;
    chrome.tabs.sendMessage(tabs[0].id, { action: "toggle-float" });
  });
  window.close();
});

  // 執行抓取圖片邏輯
  fetchImages();
});