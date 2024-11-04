document.addEventListener('DOMContentLoaded', function() {
    // 获取页面上的各个元素
    const styleSelector = document.getElementById('styleSelector');
    const applyButton = document.getElementById('applyStyle');
    const previewImage = document.getElementById('previewImage');
    const customStyleInput = document.getElementById('customStyleInput');
    const customStyleDescription = document.getElementById('customStyleDescription');
    const customCSSInput = document.getElementById('customCSSInput');
    const customCSS = document.getElementById('customCSS');
    const selectElementBtn = document.getElementById('selectElement');

    // 定义不同样式对应的预览图片
    const styleImages = {
        default: "./images/default_style.jpg",
        modern: "./images/default_style.jpg",
        retro: "./images/default_style.jpg",
        eyecare: "./images/default_style.jpg",
        cute: "./images/default_style.jpg",
        custom: "./images/default_style.jpg"
    };

    // 当样式选择器的值改变时
    styleSelector.addEventListener('change', function() {
        const selectedStyle = this.value;
        // 根据选择的样式显示或隐藏相应的输入框,并更新预览图片
        if (selectedStyle === 'custom') {
            customStyleInput.style.display = 'block';
            customCSSInput.style.display = 'none';
            previewImage.src = styleImages.custom;
        } else if (selectedStyle === 'custom-css') {
            customStyleInput.style.display = 'none';
            customCSSInput.style.display = 'block';
            previewImage.src = styleImages.custom;
        } else {
            customStyleInput.style.display = 'none';
            customCSSInput.style.display = 'none';
            previewImage.src = styleImages[selectedStyle];
        }
    });

    // 当点击"一键美化"按钮时
    applyButton.addEventListener('click', function() {
        const selectedStyle = styleSelector.value;
        const customDescription = customStyleDescription.value;
        
        // 如果选择的是默认样式或自定义CSS，直接调用函数而不显示加载提示
        if (selectedStyle === 'default' || selectedStyle === 'custom-css') {
            generateAndApplyStyle(selectedStyle, customDescription);
        } else {
            // 显示加载提示
            document.getElementById('loadingIndicator').style.display = 'block';
            
            // 禁用按钮，防止重复点击
            applyButton.disabled = true;
            
            // 调用生成并应用样式的函数
            generateAndApplyStyle(selectedStyle, customDescription)
                .then(() => {
                    // 样式应用完成后，隐藏加载提示
                    document.getElementById('loadingIndicator').style.display = 'none';
                })
                .catch((error) => {
                    console.error('生成样式时出错:', error);
                    // 出错时也要隐藏加载提示
                    document.getElementById('loadingIndicator').style.display = 'none';
                })
                .finally(() => {
                    // 无论成功还是失败，都要重新启用按钮
                    applyButton.disabled = false;
                });
        }
    });

    // 获取scope相关元素
    const scopeRadios = document.getElementsByName('scope');
    const detailsMode = document.getElementById('detailsMode');
    const siteMode = document.getElementById('siteMode');
    const allSitesMode = document.getElementById('allSitesMode');

    // 监听scope选择变化
    scopeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.value === 'details') {
                detailsMode.style.display = 'block';
                siteMode.style.display = 'none';
                allSitesMode.style.display = 'none';
            } else if (this.value === 'all') {
                detailsMode.style.display = 'none';
                siteMode.style.display = 'none';
                allSitesMode.style.display = 'block';
            } else {
                detailsMode.style.display = 'none';
                siteMode.style.display = 'block';
                allSitesMode.style.display = 'none';
            }
        });
    });

    // 处理全站点模式的代码编辑器标签切换
    const codeTabs = document.querySelectorAll('.code-tab');
    const codeEditors = document.querySelectorAll('.code-editor');

    codeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // 移除所有活动状态
            codeTabs.forEach(t => t.classList.remove('active'));
            codeEditors.forEach(e => e.classList.remove('active'));
            
            // 添加当前选中标签的活动状态
            tab.classList.add('active');
            
            // 修改这里的逻辑，确保正确获取对应的编辑器
            let editorId;
            switch(tab.dataset.tab) {
                case 'html':
                    editorId = 'customHTML';
                    break;
                case 'css':
                    editorId = 'customCSSAll';
                    break;
                case 'js':
                    editorId = 'customJS';
                    break;
            }
            
            if (editorId) {
                const editor = document.getElementById(editorId);
                if (editor) {
                    editor.classList.add('active');
                }
            }
        });
    });

    // 处理全站点模式的挂件选择
    const widgetSelector = document.getElementById('widgetSelector');
    const customWidgetInput = document.getElementById('customWidgetInput');
    const customCodeInput = document.getElementById('customCodeInput');

    widgetSelector.addEventListener('change', function() {
        const selectedWidget = this.value;
        if (selectedWidget === 'custom-widget') {
            customWidgetInput.style.display = 'block';
            customCodeInput.style.display = 'none';
        } else if (selectedWidget === 'custom-code') {
            customWidgetInput.style.display = 'none';
            customCodeInput.style.display = 'block';
        } else {
            customWidgetInput.style.display = 'none';
            customCodeInput.style.display = 'none';
        }
    });

    // 处理全站点模式的应用按钮
    document.getElementById('applyAllSites').addEventListener('click', function() {
        const selectedWidget = widgetSelector.value;
        if (selectedWidget === 'custom-code') {
            const customHTML = document.getElementById('customHTML').value;
            const customCSS = document.getElementById('customCSSAll').value;
            const customJS = document.getElementById('customJS').value;
            
            applyCustomCodeToAllSites(customHTML, customCSS, customJS);
        } else {
            applyWidgetToAllSites(selectedWidget);
        }
    });

    // 选择元素按钮点击事件
    if (selectElementBtn) {
        selectElementBtn.addEventListener('click', function() {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    action: "startElementSelection"
                });
                // 关闭popup
                window.close();
            });
        });
    }

    // 处理元素样式应用
    document.getElementById('applyElementStyle').addEventListener('click', function() {
        const description = document.getElementById('elementStyleDescription').value;
        if (!description) {
            alert('请描述您想要的样式效果');
            return;
        }

        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            chrome.tabs.sendMessage(tabs[0].id, {
                action: "applyElementStyle",
                description: description
            });
        });
    });

    // 在文档加载完成后计算并设置适当的高度
    function adjustPopupHeight() {
        // 获取内容的实际高度
        const contentHeight = document.querySelector('.container').scrollHeight;
        
        // 发送消息给background script来调整窗口高度
        chrome.runtime.sendMessage({
            action: "adjustPopupHeight",
            height: contentHeight
        });
    }

    // 初始调整
    adjustPopupHeight();

    // 监听内容变化时重新调整高度
    // 例如在切换不同模式时
    const observer = new MutationObserver(adjustPopupHeight);
    observer.observe(document.querySelector('.container'), {
        childList: true,
        subtree: true,
        attributes: true
    });

    // 监听选择器变化
    document.getElementById('styleSelector')?.addEventListener('change', () => {
        setTimeout(adjustPopupHeight, 100); // 给DOM更新一些时间
    });

    document.getElementById('widgetSelector')?.addEventListener('change', () => {
        setTimeout(adjustPopupHeight, 100);
    });

    // 监听单选按钮变化
    document.querySelectorAll('input[name="scope"]').forEach(radio => {
        radio.addEventListener('change', () => {
            setTimeout(adjustPopupHeight, 100);
        });
    });
});

// 生成并应用样式的函数
function generateAndApplyStyle(style, customDescription = '') {
    // 查询当前活动标签页
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        const activeTab = tabs[0];
        // 向活动标签页发送ping消息,检查内容脚本是否已注入
        chrome.tabs.sendMessage(activeTab.id, {action: "ping"}, function(response) {
            if (chrome.runtime.lastError) {
                // 如果出错,说明内容脚本未注入,尝试注入内容脚本
                chrome.scripting.executeScript({
                    target: { tabId: activeTab.id },
                    files: ['content.js']
                }, function() {
                    if (chrome.runtime.lastError) {
                        // 注入失败,输出错误信息
                        console.error('无法注入内容脚本:', chrome.runtime.lastError.message);
                    } else {
                        // 注入成功,处理样式应用
                        handleStyleApplication(activeTab.id, style, customDescription);
                    }
                });
            } else {
                // 内容脚本已存在,直接处理样式应用
                handleStyleApplication(activeTab.id, style, customDescription);
            }
        });
    });
}

// 处理样式应用函数
function handleStyleApplication(tabId, style, customDescription) {
    // 如果选择了自定义CSS
    if (style === 'custom-css') {
        // 应用用户输入的自定义CSS
        applyCustomCSS(tabId, customCSS.value);
    } 
    // 如果选择了默认样式
    else if (style === 'default') {
        // 发送消息给内容脚本,移除所有已应用的样式
        chrome.tabs.sendMessage(tabId, { action: "removeAllStyles" });
        // 在本地存储中设置默认样式标志
        chrome.storage.local.set({defaultStyle: true}, function() {
            console.log('默认样式标志已设置');
        });
        // 从本地存储中移除当前页面保存的样式
        chrome.storage.local.remove(tabs[0].url, function() {
            console.log('保存的样式已移除');
        });
    } 
    // 如果选择了其他预设样式
    else {
        // 获取页面结构并生成相应的样式
        getPageStructureAndGenerateStyle(tabId, style, customDescription);
    }
}

// 获取页面结构并生成样式的函数
function getPageStructureAndGenerateStyle(tabId, style, customDescription) {
    const styleId = generateUniqueStyleId();  // 生成唯一的 styleId
    chrome.tabs.sendMessage(tabId, {action: "getPageStructure"}, function(response) {
        if (chrome.runtime.lastError) {
            console.error('获取页面结构时出错:', chrome.runtime.lastError.message);
        } else if (response && response.pageStructure) {
            chrome.runtime.sendMessage({
                action: "generateAndApplyStyle",
                pageStructure: JSON.stringify(response.pageStructure, null, 2),
                style: style,
                customDescription: customDescription,
                url: response.url,
                styleId: styleId  // 传递生成的 styleId
            }, function(response) {
                if (chrome.runtime.lastError) {
                    console.error('生成并应用样式时出错:', chrome.runtime.lastError.message);
                } else {
                    console.log('样式生成并应用成功');
                    // 移除默认样式标志
                    chrome.storage.local.remove('defaultStyle', function() {
                        console.log('默认样式标志已移除');
                    });
                }
            });
        }
    });
}

// 应用自定义CSS的函数
function applyCustomCSS(tabId, css) {
    const styleId = generateUniqueStyleId();
    chrome.tabs.sendMessage(tabId, {
        action: "applyStyle",
        style: css,
        styleId: styleId
    }, function(response) {
        if (chrome.runtime.lastError) {
            console.error('应用自定义CSS时出错:', chrome.runtime.lastError.message);
        } else {
            console.log('自定义CSS应用成功');
            chrome.storage.local.remove('defaultStyle', function() {
                console.log('默认样式标志已移除');
            });
            saveCustomCSSToDatabase(css, styleId);
        }
    });
}

// 保存自定义CSS到数据库的函数
function saveCustomCSSToDatabase(css, styleId) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        let currentTab = tabs[0];
        let currentUrl = currentTab.url;

        fetch('http://127.0.0.1:5000/api/save_custom_css', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                css: css,
                url: currentUrl,
                styleId: styleId
            }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('自定义CSS保存成功:', data);
        })
        .catch((error) => {
            console.error('保存自定义CSS时出错:', error);
            // 这里可以添加用户反馈，比如显示一个错误消息
            alert('保存自定义CSS失败，请稍后再试。');
        });
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

// 添加应用代码到所有站点的函数
function applyCustomCodeToAllSites(html, css, js) {
    // 这里实现将代码应用到所有站点的逻辑
    chrome.storage.local.set({
        globalCustomCode: {
            html: html,
            css: css,
            js: js
        }
    }, function() {
        console.log('全局自定义代码已保存');
    });
}

// 添加应用挂件到所有站点的函数
function applyWidgetToAllSites(widgetType) {
    // 这里实现将挂件应用到所有站点的逻辑
    chrome.storage.local.set({
        globalWidget: widgetType
    }, function() {
        console.log('全局挂件设置已保存');
    });
}
