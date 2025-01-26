// 使用 Promise 獲取 storage 值
async function getActiveTabOrigin() {
  return new Promise((resolve) => {
    chrome.storage.local.get("active_tab_origin", (result) => {
      resolve(result.active_tab_origin || "");
    });
  });
}

// 更新規則
async function updateRules() {
  const activeTabOrigin = await getActiveTabOrigin(); // 獲取存儲的 active_tab_origin

  if (!activeTabOrigin) {
    console.warn("active_tab_origin 未設置，無法設置規則");
    return;
  }

  // 設置 declarativeNetRequest 的規則
  chrome.declarativeNetRequest.updateDynamicRules({
    addRules: [
      {
        id: 1,
        priority: 1,
        action: {
          type: "modifyHeaders",
          requestHeaders: [
            {
              header: "Referer",
              operation: "set",
              value: activeTabOrigin
            }
          ]
        },
        condition: {
          resourceTypes: ["image", "media", "object"],
          urlFilter: "*://*/*"
        }
      }
    ],
    removeRuleIds: [1]
  });

  console.log("規則已更新，Referer 修改為：", activeTabOrigin);
}

// 監聽標籤頁切換事件
chrome.tabs.onActivated.addListener(() => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0] && tabs[0].url) {
      const url = new URL(tabs[0].url);
      const origin = url.origin;

      // 存儲 active_tab_origin
      chrome.storage.local.set({ active_tab_origin: origin }, () => {
        console.log("active_tab_origin 已更新為：", origin);
        updateRules(); // 更新規則
      });
    }
  });
});

// 初始化時設置一次規則
updateRules();
