// StyleSwift Service Worker
// 负责扩展生命周期管理和 Side Panel 行为设置

// 设置 Side Panel 行为：点击扩展图标自动打开 Side Panel
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
