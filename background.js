let windowId = null;

chrome.action.onClicked.addListener(async () => {
  // 如果窗口已经打开，就关闭它
  if (windowId !== null) {
    chrome.windows.remove(windowId);
    windowId = null;
    return;
  }

  // 获取屏幕信息
  const screen = await chrome.system.display.getInfo();
  const primaryDisplay = screen[0];
  
  // 设置窗口的宽度和高度
  const windowWidth = 400;
  const windowHeight = 600;
  
  // 计算右中部位置
  const left = primaryDisplay.workArea.width - windowWidth - 20; // 距离右边缘20像素
  const top = (primaryDisplay.workArea.height - windowHeight) / 2; // 垂直居中

  // 创建新窗口，设置位置在右中部
  const popup = await chrome.windows.create({
    url: 'popup.html',
    type: 'popup',
    width: windowWidth,
    height: windowHeight,
    left: left,
    top: top,
    focused: true
  });
  
  windowId = popup.id;
});

// 监听窗口关闭事件
chrome.windows.onRemoved.addListener((closedWindowId) => {
  if (closedWindowId === windowId) {
    windowId = null;
  }
});

// 监听来自其他部分的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "applyStyle") {
    // 如果收到应用样式的请求
    applyStyle(request.style, request.url);
    sendResponse({success: true});
  } else if (request.action === "generateAndApplyStyle") {
    // 如果收到生成并应用样式的请求
    generateAndApplyStyle(request.pageStructure, request.style, request.customDescription, request.url, request.styleId);
    sendResponse({success: true});
  } else if (request.action === "submitRating") {
    // 如果收到提交评分的请求
    submitRating(request.styleId, request.rating)
      .then(() => sendResponse({success: true}))
      .catch(() => sendResponse({success: false}));
    return true; // 保持消息通道开放，以便异步响应
  } else if (request.action === "adjustPopupHeight") {
    if (windowId !== null) {
      chrome.windows.update(windowId, {
        height: request.height + 60 // 添加一些额外空间给窗口边框
      });
    }
  }
  return true; // 保持消息通道开放，以便异步响应
});

// 应用样式的函数
function applyStyle(style, url) {
  // 向服务器发送应用样式的请求
  fetch('http://127.0.0.1:5000/api/apply_style', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ style_id: style }),
  })
  .then(response => response.json()) // 将响应转换为JSON
  .then(data => {
    if (data.style_code) {
      // 如果响应中包含样式代码，则注入CSS
      injectCSS(data.style_code);
    }
  })
  .catch(error => console.error('错误:', error)); // 捕获并打印错误
}

// 注入CSS的函数
function injectCSS(css, styleId) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (!tabs || tabs.length === 0 || !tabs[0].url || tabs[0].url.startsWith("chrome://")) {
      console.log("无法注入CSS");
      return;
    }
    
    chrome.tabs.sendMessage(tabs[0].id, {
      action: "applyStyle",
      style: css,
      styleId: styleId
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
      } else {
        console.log('CSS注入成功');
      }
    });
  });
}

// 生成并应用样式的函���
function generateAndApplyStyle(pageStructure, style, customDescription, url, styleId) {
  fetch('http://127.0.0.1:5000/api/generate_ai_style', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      pageStructure: pageStructure, 
      style: style, 
      customDescription: customDescription, 
      url: url,
      styleId: styleId
    }),
  })
  .then(response => response.json())
  .then(data => {
    if (data.style_code) {
      chrome.storage.local.set({
        [url]: {
          style_code: data.style_code,
          style_id: styleId
        }
      }, function() {
        console.log('AI生成的样式已保存');
        injectCSS(data.style_code, styleId);
      });
    } else {
      console.error('响应中没有style_code');
    }
  })
  .catch(error => {
    console.error('错误:', error);
  });
}

// 提交评分的函数
function submitRating(styleId, rating) {
  // 向服务器发送提交评分的请求
  return fetch('http://127.0.0.1:5000/api/submit_rating', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ style_id: styleId, rating: rating }),
  })
  .then(response => {
    if (!response.ok) {
      // 如果响应不成功，抛出错误
      throw new Error('评分提交失败');
    }
    return response.json(); // 将响应转换为JSON
  });
}

function generateUniqueStyleId() {
  const timestamp = Date.now();
  const randomNum = Math.floor(Math.random() * 1000000);
  const userSpecificInfo = getUserSpecificInfo(); // 这个函数需要另外实现
  return `style_${timestamp}_${randomNum}_${userSpecificInfo}`;
}

function getUserSpecificInfo() {
  // 这里可以返回一些用户特定的信息，比如用户ID（如果有的话）
  // 如果没有用户特定信息，可以返回一个随机字符串
  return Math.random().toString(36).substring(2, 15);
}
