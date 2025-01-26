//import './setReferrer.js'; 

document.addEventListener('DOMContentLoaded', () => {
  // 抓取圖片邏輯
  function fetchImages() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.sendMessage(
        tabs[0].id,
        { type: 'getImages' },
        (response) => {
          if (response && response.images) {
            displayImages(response.images);
            localStorage.active_tab_origin = response.origin;
          }
        }
      );
    });
  }

  // 顯示圖片到頁面
  function displayImages(images) {
    const container = document.getElementById('image-container');
    container.innerHTML = '';
    images.forEach((src) => {
      const img = document.createElement('img');
      img.src = encodeURI(src);
      img.style.margin = '5px';
      img.addEventListener('click', () => {
        img.classList.toggle('selected');
      });
      container.appendChild(img);
    });
  }

  // 發送選中的圖片到後端
  function sendSelectedImages() {
    const selectedImages = Array.from(
      document.querySelectorAll('#image-container img.selected')
    ).map((img) => img.src);

    if (selectedImages.length === 0) {
      alert('Please select at least one image to send.');
      return;
    }

    fetch('https://your-backend-api.com/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ images: selectedImages }),
    })
      .then((response) => {
        if (response.ok) {
          alert('圖片已成功傳送！');
        } else {
          alert('傳送失敗，請稍後再試！');
        }
      })
      .catch((error) => {
        console.error('Error:', error);
        alert('發生錯誤，請檢查網路或後端狀態。');
      });
  }

  // 綁定事件
  document.getElementById('send-images').addEventListener('click', sendSelectedImages);

  // 執行抓取圖片邏輯
  fetchImages();
});