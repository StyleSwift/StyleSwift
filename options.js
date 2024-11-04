// 当选项页面加载完成时执行
document.addEventListener('DOMContentLoaded', function() {
  // 获取自定义CSS文本区域和保存按钮
  const customCSSTextarea = document.getElementById('customCSS');
  const saveButton = document.getElementById('saveCustomStyle');

  // 从存储中加载已保存的自定义CSS
  chrome.storage.sync.get('customCSS', function(data) {
    if (data.customCSS) {
      customCSSTextarea.value = data.customCSS;
    }
  });

  // 添加保存按钮的点击事件监听器
  saveButton.addEventListener('click', function() {
    // 获取文本区域中的CSS
    const customCSS = customCSSTextarea.value;
    
    // 保存CSS到存储
    chrome.storage.sync.set({customCSS: customCSS}, function() {
      console.log('自定义CSS已保存');
      // 可以在这里添加保存成功的提示
    });
  });
});
