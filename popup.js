// 北京时间工具函数
function getBeijingTime() {
    const now = new Date();
    // 获取北京时间（UTC+8）
    const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return beijingTime;
}

function formatBeijingTime(date = null) {
    if (!date) date = getBeijingTime();
    return date.toISOString().replace('T', ' ').substring(0, 23) + ' CST';
}

function calculateDuration(startTime, endTime = null) {
    if (!endTime) endTime = new Date();
    return (endTime - startTime) / 1000; // 返回秒
}

// 添加DOMContentLoaded事件监听器
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
        
        console.log('=== 用户发起站点模式样式请求 ===');
        console.log('操作时间:', formatBeijingTime());
        console.log('选择的样式:', selectedStyle);
        console.log('自定义描述:', customDescription);
        
        // 为所有情况都显示加载提示并使用Promise链
        console.log('显示加载指示器...');
        document.getElementById('loadingIndicator').style.display = 'block';
        
        // 禁用按钮，防止重复点击
        applyButton.disabled = true;
        console.log('已禁用应用按钮，防止重复请求');
        
        // 调用生成并应用样式的函数
        generateAndApplyStyle(selectedStyle, customDescription)
            .then(() => {
                console.log('样式生成和应用流程完成');
                // 样式应用完成后，隐藏加载提示
                document.getElementById('loadingIndicator').style.display = 'none';
            })
            .catch((error) => {
                console.error('生成样式时出错:', error);
                console.log('隐藏加载指示器（出错）');
                // 出错时也要隐藏加载提示
                document.getElementById('loadingIndicator').style.display = 'none';
            })
            .finally(() => {
                console.log('重新启用应用按钮');
                // 无论成功还是失败，都要重新启用按钮
                applyButton.disabled = false;
            });
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
        // 统一使用 applyWidgetToAllSitesEnhanced 处理所有挂件类型
        applyWidgetToAllSitesEnhanced(selectedWidget);
    });

    // 选择元素按钮点击事件
    if (selectElementBtn) {
        selectElementBtn.addEventListener('click', function() {
            const isSelected = this.textContent === '取消选中';
            
            if (isSelected) {
                chrome.storage.local.remove('selectedElement', () => {
                    this.textContent = '定位元素';
                    this.classList.remove('bg-gray-500');
                    this.classList.add('bg-blue-500');
                });
                return;
            }
            
            // 查询所有标签页
            chrome.tabs.query({}, function(tabs) {
                // 过滤出不是扩展页面的标签页
                const normalTabs = tabs.filter(tab => 
                    !tab.url.startsWith('chrome-extension://') && 
                    !tab.url.startsWith('chrome://') &&
                    !tab.url.startsWith('edge://') &&
                    tab.url !== ''
                );

                // 找到最后激活的普通标签页
                const targetTab = normalTabs.find(tab => tab.active) || normalTabs[0];

                if (!targetTab) {
                    console.error('没有找到可用的标签页');
                    return;
                }

                // 确保目标标签页处于激活状态，但不关闭扩展窗口
                chrome.tabs.update(targetTab.id, { active: true }, () => {
                    // 使用回调函数方式发送消息
                    chrome.tabs.sendMessage(
                        targetTab.id,
                        { action: "startElementSelection" },
                        function(response) {
                            if (chrome.runtime.lastError) {
                                console.error('Failed to send message:', chrome.runtime.lastError);
                                // 如果是因为content script未注入导致的错误，尝试注入content script
                                chrome.scripting.executeScript({
                                    target: { tabId: targetTab.id },
                                    files: ['content.js']
                                }, function() {
                                    if (chrome.runtime.lastError) {
                                        console.error('Failed to inject content script:', chrome.runtime.lastError);
                                        return;
                                    }
                                    
                                    // 等待一小段时间确保content script初始化完成
                                    setTimeout(() => {
                                        // 重试发送消息
                                        chrome.tabs.sendMessage(
                                            targetTab.id,
                                            { action: "startElementSelection" },
                                            function(retryResponse) {
                                                if (chrome.runtime.lastError) {
                                                    console.error('Retry failed:', chrome.runtime.lastError);
                                                }
                                            }
                                        );
                                    }, 200);
                                });
                            }
                        }
                    );
                });
            });
        });
    }

    // 处理元素样式应用
    document.getElementById('applyElementStyle').addEventListener('click', async function() {
        const description = document.getElementById('elementStyleDescription').value;
        if (!description) {
            alert('请描述您想要的样式效果');
            return;
        }

        // 获取选中的元素信息
        const data = await chrome.storage.local.get(['selectedElement']);
        if (!data.selectedElement) {
            alert('请先选择要美化的元素');
            return;
        }

        // 调用统一的生成和应用样式函数
        const result = await generateAndApplyElementStyle(
            data.selectedElement.details,
            description
        );

        if (!result.success) {
            alert('应用样式失败：' + (result.error || '未知错误'));
        }
    });

    // 修改 adjustPopupHeight 函数，添加重试机制
    function adjustPopupHeight() {
        // 获取内容的实际高度
        const contentHeight = document.querySelector('.container').scrollHeight;
        
        // 添加重试机制发送消息
        const tryAdjustHeight = (retryCount = 0) => {
            chrome.runtime.sendMessage({
                action: "adjustPopupHeight",
                height: contentHeight
            }, response => {
                if (chrome.runtime.lastError && retryCount < 3) {
                    // 如果发送失败且未超过重试次数，等待100ms后重试
                    setTimeout(() => tryAdjustHeight(retryCount + 1), 100);
                }
            });
        };

        tryAdjustHeight();
    }

    // 添加定期检查和调整高度的功能
    function setupHeightAdjustment() {
        // 初始调整
        adjustPopupHeight();

        // 监听内容变化
        const observer = new MutationObserver(() => {
            adjustPopupHeight();
        });

        observer.observe(document.querySelector('.container'), {
            childList: true,
            subtree: true,
            attributes: true
        });

        // 添加定期检查机制
        setInterval(adjustPopupHeight, 1000); // 每秒检查一次

        // 监听用户交互事件
        document.addEventListener('click', () => {
            setTimeout(adjustPopupHeight, 100);
        });

        document.addEventListener('input', () => {
            setTimeout(adjustPopupHeight, 100);
        });

        // 监听选择器变化
        document.getElementById('styleSelector')?.addEventListener('change', () => {
            setTimeout(adjustPopupHeight, 100);
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
    }

    // 确保在 DOM 加载完成后初始化高度调整
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupHeightAdjustment);
    } else {
        setupHeightAdjustment();
    }

    // 在DOMContentLoaded事件监听器中添加：
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "updateElementButton") {
            const selectBtn = document.getElementById('selectElement');
            if (selectBtn) {
                selectBtn.textContent = message.selected ? '取消选中' : '定位元素';
                selectBtn.classList.toggle('bg-blue-500', !message.selected);
                selectBtn.classList.toggle('bg-gray-500', message.selected);
            }
        }
    });
});

// 添加生成 style_id 的函数
function generateStyleId() {
    return `style_${Date.now()}`;
}

// 生成并应用样式的函数
function generateAndApplyStyle(style, customDescription = '') {
    console.log('=== generateAndApplyStyle 函数开始 ===');
    console.log('参数 - 样式:', style);
    console.log('参数 - 描述:', customDescription);
    
    return new Promise((resolve, reject) => {
        // 获取扩展窗口的 ID
        chrome.windows.getCurrent(currentWindow => {
            console.log('获取当前窗口完成');
            // 查询所有标签页，找到不是扩展页面的活动标签页
            chrome.tabs.query({}, function(tabs) {
                console.log('查询到标签页数量:', tabs.length);
                // 过滤出不是扩展页面的标签页
                const normalTabs = tabs.filter(tab => 
                    !tab.url.startsWith('chrome-extension://') && 
                    !tab.url.startsWith('chrome://')
                );
                console.log('过滤后的普通标签页数量:', normalTabs.length);

                // 找到最后激活的普通标签页
                const targetTab = normalTabs.find(tab => tab.active) || normalTabs[0];

                if (!targetTab) {
                    const error = new Error('没有找到可应用样式的标签页');
                    console.error(error.message);
                    reject(error);
                    return;
                }
                
                console.log('目标标签页:', {
                    id: targetTab.id,
                    url: targetTab.url,
                    title: targetTab.title
                });

                try {
                    // 激活目标标签页
                    chrome.tabs.update(targetTab.id, { active: true }, () => {
                        handleStyleApplication(targetTab.id, style, customDescription, resolve, reject);
                    });
                } catch (error) {
                    console.error('应用样式时出错:', error);
                    reject(error);
                }
            });
        });
    });
}

// 处理样式应用函数
function handleStyleApplication(tabId, style, customDescription, resolve, reject) {
    const startTime = getBeijingTime();
    console.log('=== 样式应用处理开始 ===');
    console.log('开始时间:', formatBeijingTime(startTime));
    console.log('标签页ID:', tabId);
    console.log('样式类型:', style);
    console.log('自定义描述:', customDescription);

    chrome.runtime.sendMessage({
        action: "generateAndApplyStyle",
        style: style,
        customDescription: customDescription,
        tabId: tabId
    }, response => {
        const endTime = getBeijingTime();
        const duration = calculateDuration(startTime, endTime);
        
        console.log('=== 样式应用处理完成 ===');
        console.log('结束时间:', formatBeijingTime(endTime));
        console.log('总耗时:', duration.toFixed(3), '秒');
        console.log('后台响应:', response);
        
        if (chrome.runtime.lastError) {
            console.error('消息发送失败:', chrome.runtime.lastError);
            reject(new Error('消息发送失败: ' + chrome.runtime.lastError.message));
            return;
        }
        
        if (response && response.success) {
            // 检查是否是重复样式
            if (response.is_duplicate) {
                console.log('🔄 检测到重复样式，使用现有样式:', response.style_id);
                console.log('样式应用成功 - 已应用到所有网站');
            } else {
                console.log('✅ 新样式生成并应用成功:', response.style_id);
                console.log('样式应用成功 - 已应用到所有网站');
            }
            resolve();
        } else {
            const errorMsg = response ? response.error : '未知错误';
            console.error('样式应用失败:', errorMsg);
            reject(new Error(errorMsg));
        }
    });
}

// 获取页面结构并生成样式的函数
function getPageStructureAndGenerateStyle(tabId, style, customDescription, resolve, reject) {
    console.log('=== 获取页面结构并生成样式 ===');
    console.log('目标标签页ID:', tabId);
    console.log('样式类型:', style);
    console.log('自定义描述:', customDescription);
    
    const styleId = generateStyleId();
    console.log('生成的样式ID:', styleId);
    
    try {
        console.log('发送获取页面结构消息到内容脚本...');
        chrome.tabs.sendMessage(tabId, {
            action: "getPageStructure"
        }, function(response) {
            console.log('收到页面结构响应:', response ? '成功' : '失败');
            if (chrome.runtime.lastError) {
                console.log('内容脚本未注入，开始注入...');
                // 如果内容脚本未注入，先注入内容脚本
                chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    files: ['content.js']
                }, function() {
                    if (chrome.runtime.lastError) {
                        console.error('注入内容脚本失败:', chrome.runtime.lastError);
                        alert('无法在此页面应用样式');
                        reject(new Error('注入内容脚本失败'));
                        return;
                    }
                    console.log('内容脚本注入成功，重试获取页面结构...');
                    // 重试获取页面结构
                    setTimeout(() => {
                        chrome.tabs.sendMessage(tabId, {
                            action: "getPageStructure"
                        }, (response) => handlePageStructureResponse(response, resolve, reject));
                    }, 100);
                });
                return;
            }
            handlePageStructureResponse(response, resolve, reject);
        });
    } catch (error) {
        console.error('获页面结构时出错:', error);
        reject(error);
    }

    function handlePageStructureResponse(response, resolve, reject) {
        if (!response || !response.pageStructure) {
            console.error('获取页面结构失败');
            reject(new Error('获取页面结构失败'));
            return;
        }

        console.log('页面结构获取成功:', {
            url: response.url,
            structureLength: JSON.stringify(response.pageStructure).length
        });

        try {
            console.log('发送生成样式请求到 Background...');
            const backgroundRequestStart = new Date();
            
            chrome.runtime.sendMessage({
                action: "generateAndApplyStyle",
                pageStructure: JSON.stringify(response.pageStructure, null, 2),
                style: style,
                customDescription: customDescription,
                url: response.url,
                styleId: styleId
            }, function(response) {
                const backgroundRequestEnd = new Date();
                const backgroundDuration = calculateDuration(backgroundRequestStart, backgroundRequestEnd);
                
                if (chrome.runtime.lastError) {
                    console.error('生成样式失败:', chrome.runtime.lastError);
                    reject(new Error('生成样式失败'));
                } else {
                    console.log(`Background 处理完成 - 耗时: ${backgroundDuration.toFixed(3)}秒`);
                    console.log('Background 响应:', response);
                    resolve();
                }
                
                chrome.storage.local.remove('defaultStyle');
                console.log('=== 整个样式生成流程完成 ===');
            });
        } catch (error) {
            console.error('生成并应用样式时出错:', error);
            reject(error);
        }
    }
}

// 应用自定义CSS的函数
function applyCustomCSS(tabId, css, resolve, reject) {
    const styleId = generateUniqueStyleId();
    console.log('=== 应用自定义CSS开始 ===');
    console.log('样式ID:', styleId);
    console.log('CSS长度:', css ? css.length : 0);
    
    chrome.tabs.get(tabId, function(tab) {
        if (chrome.runtime.lastError) {
            console.error('获取标签页信息失败:', chrome.runtime.lastError);
            reject(new Error('获取标签页信息失败'));
            return;
        }

        const hostname = new URL(tab.url).hostname;
        console.log('目标域名:', hostname);

        // 保存到后台数据库
        saveCustomCSSToDatabase(css, styleId)
            .then(result => {
                console.log('CSS保存结果:', result);
                
                // 检查是否是重复样式
                if (result.is_duplicate) {
                    console.log('🔄 检测到重复CSS，使用现有样式:', result.style_id);
                } else {
                    console.log('✅ 新CSS保存成功:', result.style_id);
                }

                const finalStyleId = result.style_id;

                // 应用到当前标签页并使用最终的样式ID
                const tryApplyStyle = (retryCount = 0) => {
                    chrome.tabs.sendMessage(tabId, {
                        action: "applyStyle",
                        style: css,
                        styleId: finalStyleId
                    }, function(response) {
                        if (chrome.runtime.lastError) {
                            console.warn(`尝试 ${retryCount + 1}: 发送消息失败:`, chrome.runtime.lastError);
                            if (retryCount < 2) {
                                console.log('重试应用样式...');
                                setTimeout(() => tryApplyStyle(retryCount + 1), 1000);
                            } else {
                                console.error('应用样式最终失败');
                                reject(new Error('应用样式失败: ' + chrome.runtime.lastError.message));
                            }
                            return;
                        }

                        if (response && response.success) {
                            console.log('自定义CSS应用成功');
                            resolve();
                        } else {
                            console.error('应用样式失败:', response);
                            reject(new Error('应用样式失败'));
                        }
                    });
                };

                tryApplyStyle();
            })
            .catch(error => {
                console.error('保存CSS到数据库失败:', error);
                reject(error);
            });
    });
}

// 确保内容脚本已注入的函数
async function ensureContentScriptInjected(tabId) {
    try {
        // 尝试发送测试消息
        await chrome.tabs.sendMessage(tabId, { action: "ping" });
        return true;
    } catch (error) {
        // 如果消息发送失败，尝试注入内容脚本
        try {
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: ['content.js']
            });
            
            // 等待内容脚本初始化
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 再次验证内容脚本是否成功注入
            try {
                await chrome.tabs.sendMessage(tabId, { action: "ping" });
                return true;
            } catch (verifyError) {
                console.error('内容脚本注入后验证失败:', verifyError);
                return false;
            }
        } catch (injectionError) {
            console.error('注入内容脚本失败:', injectionError);
            return false;
        }
    }
}

// 保存自定义CSS到数据库的函数
function saveCustomCSSToDatabase(css, styleId) {
    getActiveTab(function(tab) {
        fetch('http://127.0.0.1:5000/api/save_custom_css', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                css: css,
                url: tab.url,
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
            alert('保存自定义CSS失败，请稍后再试。');
        });
    });
}

// 生成唯一样式ID的函数
function generateUniqueStyleId() {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 1000000);
    const userSpecificInfo = getUserSpecificInfo(); // 这个函数需要另外实现
    return `style_${timestamp}_${randomNum}_${userSpecificInfo}`;
  }

// 获取用户特定信息的函数
function getUserSpecificInfo() {
    // 这里可以返回一些用户特定的信息，比如用户ID（如果有的话）
    // 如果没有用户特定信息，可以返回一个随机字符串
    return Math.random().toString(36).substring(2, 15);
  }

// 生成挂件ID的函数
function generateWidgetId() {
    return `widget_${Date.now()}`;
}

// 增强版应用挂件到所有站点函数
async function applyWidgetToAllSitesEnhanced(widgetType) {
    const requestStartTime = getBeijingTime();
    console.log('=== 应用挂件到所有站点 ===');
    console.log('开始时间:', formatBeijingTime(requestStartTime));
    console.log('挂件类型:', widgetType);
    
    // 获取应用按钮，用于禁用状态控制
    const applyButton = document.getElementById('applyAllSites');
    let showLoading = false;
    
    try {
        if (widgetType === 'default') {
            // 移除所有挂件
            console.log('移除所有挂件');
            await removeAllWidgets();
            return;
        }
        
        let widgetData;
        
        if (['catgirl', 'transformer', 'pokemon'].includes(widgetType)) {
            // 预设挂件：从数据库获取
            console.log('获取预设挂件:', widgetType);
            const response = await fetch('http://127.0.0.1:5000/api/apply_widget', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ widget_id: widgetType })
            });
            
            if (!response.ok) {
                throw new Error(`获取预设挂件失败: ${response.status}`);
            }
            
            const data = await response.json();
            widgetData = {
                widgetId: data.widget_id,
                html: data.html_code,
                css: data.css_code,
                js: data.js_code,
                config: JSON.parse(data.default_config || '{}')
            };
        } else if (widgetType === 'custom-widget') {
            // 自定义挂件：AI生成 - 需要显示加载状态
            const description = document.getElementById('customWidgetDescription').value;
            if (!description) {
                console.warn('请先描述您想要的自定义挂件');
                alert('请先描述您想要的自定义挂件');
                return;
            }
            
            showLoading = true;
            console.log('=== 开始AI生成自定义挂件 ===');
            console.log('显示加载指示器...');
            document.getElementById('loadingIndicator').style.display = 'block';
            
            // 禁用按钮，防止重复点击
            if (applyButton) {
                applyButton.disabled = true;
                console.log('已禁用应用按钮，防止重复请求');
            }
            
            const aiStart = getBeijingTime();
            console.log('AI生成开始时间:', formatBeijingTime(aiStart));
            
            widgetData = await generateCustomWidget(description);
            
            const aiEnd = getBeijingTime();
            const aiDuration = calculateDuration(aiStart, aiEnd);
            console.log('AI生成完成，耗时:', aiDuration.toFixed(3), '秒');
            
        } else if (widgetType === 'custom-code') {
            // 自定义代码：保存并应用
            const html = document.getElementById('customHTML').value;
            const css = document.getElementById('customCSSAll').value;
            const js = document.getElementById('customJS').value;
            
            console.log('=== 保存自定义代码挂件 ===');
            widgetData = await saveCustomWidgetCode(html, css, js);
        }
        
        if (widgetData) {
            console.log('=== 开始应用挂件到所有标签页 ===');
            console.log('挂件ID:', widgetData.widgetId);
            
            // 保存挂件配置到本地存储
            await chrome.storage.local.set({
                globalWidget: {
                    ...widgetData,
                    enabled: true
                }
            });
            
            // 通知所有标签页应用挂件
            await applyWidgetToAllTabs(widgetData);
            
            if (widgetData.isDuplicate) {
                console.log('🔄 使用现有挂件:', widgetData.widgetId);
            } else {
                console.log('✅ 新挂件应用成功:', widgetData.widgetId);
            }
            console.log('挂件应用成功 - 已应用到所有网站');
        }
    } catch (error) {
        console.error('=== 应用挂件失败 ===');
        console.error('错误详情:', error);
        alert('应用挂件失败: ' + error.message);
    } finally {
        // 隐藏加载指示器
        if (showLoading) {
            console.log('隐藏加载指示器');
            document.getElementById('loadingIndicator').style.display = 'none';
        }
        
        // 重新启用按钮
        if (applyButton) {
            applyButton.disabled = false;
            console.log('重新启用应用按钮');
        }
        
        const requestEndTime = getBeijingTime();
        const totalDuration = calculateDuration(requestStartTime, requestEndTime);
        console.log('=== 挂件应用流程完成 ===');
        console.log('总耗时:', totalDuration.toFixed(3), '秒');
    }
}

// 生成自定义挂件
async function generateCustomWidget(description, existingWidget = null) {
    const functionStartTime = getBeijingTime();
    console.log('=== generateCustomWidget 函数开始 ===');
    console.log('函数开始时间:', formatBeijingTime(functionStartTime));
    
    try {
        const widgetId = generateWidgetId();
        console.log('生成的挂件ID:', widgetId);
        console.log('描述内容:', description);
        console.log('描述长度:', description ? description.length : 0, '字符');
        console.log('现有挂件:', existingWidget ? '存在' : '无');
        
        const requestStartTime = getBeijingTime();
        console.log('开始发送API请求 - 时间:', formatBeijingTime(requestStartTime));
        
        const response = await fetch('http://localhost:5000/api/generate_ai_widget', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: description,
                widgetId: widgetId,
                existingWidget: existingWidget
            })
        });

        const requestEndTime = getBeijingTime();
        const requestDuration = calculateDuration(requestStartTime, requestEndTime);
        console.log('API请求完成 - 时间:', formatBeijingTime(requestEndTime));
        console.log('API请求耗时:', requestDuration.toFixed(3), '秒');
        console.log('响应状态码:', response.status);

        const result = await response.json();
        console.log('API响应解析完成');
        console.log('响应数据长度:', JSON.stringify(result).length, '字符');
        
        if (response.ok) {
            // 检查是否是重复挂件
            if (result.is_duplicate) {
                console.log('🔄 检测到重复挂件代码，使用现有挂件:', result.widget_id);
                console.log('HTML代码长度:', result.html_code ? result.html_code.length : 0);
                console.log('CSS代码长度:', result.css_code ? result.css_code.length : 0);
                console.log('JS代码长度:', result.js_code ? result.js_code.length : 0);
                
                return {
                    widgetId: result.widget_id,
                    html: result.html_code,
                    css: result.css_code,
                    js: result.js_code,
                    config: {
                        position: { x: 20, y: 100 },
                        size: { width: 200, height: 300 }
                    },
                    isDuplicate: true
                };
            } else {
                console.log('✅ 新挂件生成成功:', result.widget_id);
                console.log('HTML代码长度:', result.html_code ? result.html_code.length : 0);
                console.log('CSS代码长度:', result.css_code ? result.css_code.length : 0);
                console.log('JS代码长度:', result.js_code ? result.js_code.length : 0);
                
                return {
                    widgetId: result.widget_id,
                    html: result.html_code,
                    css: result.css_code,
                    js: result.js_code,
                    config: {
                        position: { x: 20, y: 100 },
                        size: { width: 200, height: 300 }
                    },
                    isDuplicate: false
                };
            }
        } else {
            const errorMsg = result.error || '生成挂件失败';
            console.error('API请求失败:', errorMsg);
            throw new Error(errorMsg);
        }
    } catch (error) {
        const errorTime = getBeijingTime();
        console.error('=== generateCustomWidget 函数失败 ===');
        console.error('错误时间:', formatBeijingTime(errorTime));
        console.error('错误类型:', error.name);
        console.error('错误消息:', error.message);
        console.error('完整错误:', error);
        throw error;
    } finally {
        const functionEndTime = getBeijingTime();
        const totalDuration = calculateDuration(functionStartTime, functionEndTime);
        console.log('=== generateCustomWidget 函数完成 ===');
        console.log('函数结束时间:', formatBeijingTime(functionEndTime));
        console.log('函数总耗时:', totalDuration.toFixed(3), '秒');
    }
}

// 保存自定义代码挂件
async function saveCustomWidgetCode(html, css, js) {
    const functionStartTime = getBeijingTime();
    console.log('=== saveCustomWidgetCode 函数开始 ===');
    console.log('函数开始时间:', formatBeijingTime(functionStartTime));
    
    try {
        const widgetId = generateWidgetId();
        console.log('生成的挂件ID:', widgetId);
        console.log('HTML代码长度:', html ? html.length : 0, '字符');
        console.log('CSS代码长度:', css ? css.length : 0, '字符');
        console.log('JS代码长度:', js ? js.length : 0, '字符');
        console.log('总代码长度:', (html?.length || 0) + (css?.length || 0) + (js?.length || 0), '字符');
        
        const requestStartTime = getBeijingTime();
        console.log('开始发送保存请求 - 时间:', formatBeijingTime(requestStartTime));
        
        const response = await fetch('http://localhost:5000/api/save_custom_widget_code', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                html: html,
                css: css,
                js: js,
                widgetId: widgetId
            })
        });

        const requestEndTime = getBeijingTime();
        const requestDuration = calculateDuration(requestStartTime, requestEndTime);
        console.log('保存请求完成 - 时间:', formatBeijingTime(requestEndTime));
        console.log('保存请求耗时:', requestDuration.toFixed(3), '秒');
        console.log('响应状态码:', response.status);

        const result = await response.json();
        console.log('保存响应解析完成');
        console.log('响应消息:', result.message);
        
        if (response.ok) {
            // 检查是否是重复挂件
            if (result.is_duplicate) {
                console.log('🔄 检测到重复挂件代码，使用现有挂件:', result.widget_id);
                return {
                    widgetId: result.widget_id,
                    html: html || '',
                    css: css || '',
                    js: js || '',
                    isDuplicate: true
                };
            } else {
                console.log('✅ 新挂件代码保存成功:', result.widget_id);
                return {
                    widgetId: result.widget_id,
                    html: html || '',
                    css: css || '',
                    js: js || '',
                    isDuplicate: false
                };
            }
        } else {
            const errorMsg = result.message || '保存挂件失败';
            console.error('保存请求失败:', errorMsg);
            throw new Error(errorMsg);
        }
    } catch (error) {
        const errorTime = getBeijingTime();
        console.error('=== saveCustomWidgetCode 函数失败 ===');
        console.error('错误时间:', formatBeijingTime(errorTime));
        console.error('错误类型:', error.name);
        console.error('错误消息:', error.message);
        console.error('完整错误:', error);
        throw error;
    } finally {
        const functionEndTime = getBeijingTime();
        const totalDuration = calculateDuration(functionStartTime, functionEndTime);
        console.log('=== saveCustomWidgetCode 函数完成 ===');
        console.log('函数结束时间:', formatBeijingTime(functionEndTime));
        console.log('函数总耗时:', totalDuration.toFixed(3), '秒');
    }
}

// 应用挂件到所有标签页
async function applyWidgetToAllTabs(widgetData) {
    const tabs = await chrome.tabs.query({});
    const normalTabs = tabs.filter(tab => 
        !tab.url.startsWith('chrome-extension://') && 
        !tab.url.startsWith('chrome://') &&
        !tab.url.startsWith('edge://') &&
        tab.url !== ''
    );
    
    console.log(`开始向 ${normalTabs.length} 个标签页应用挂件`);
    
    for (const tab of normalTabs) {
        try {
            // 确保内容脚本已注入
            await ensureContentScriptInjected(tab.id);
            
            // 发送挂件数据到标签页
            await chrome.tabs.sendMessage(tab.id, {
                action: "applyWidget",
                widget: widgetData
            });
            
            console.log(`挂件已应用到标签页: ${tab.title}`);
        } catch (error) {
            console.warn(`无法在标签页 ${tab.id} 应用挂件:`, error);
        }
    }
}

// 移除所有挂件
async function removeAllWidgets() {
    await chrome.storage.local.remove('globalWidget');
    
    const tabs = await chrome.tabs.query({});
    const normalTabs = tabs.filter(tab => 
        !tab.url.startsWith('chrome-extension://') && 
        !tab.url.startsWith('chrome://')
    );
    
    for (const tab of normalTabs) {
        try {
            await chrome.tabs.sendMessage(tab.id, {
                action: "removeWidget"
            });
        } catch (error) {
            console.warn(`无法在标签页 ${tab.id} 移除挂件:`, error);
        }
    }
    
    console.log('所有挂件已移除');
}

// 获取当前活动标签页的函数
function getActiveTab(callback) {
    chrome.tabs.query({}, function(tabs) {
        const normalTabs = tabs.filter(tab => 
            !tab.url.startsWith('chrome-extension://') && 
            !tab.url.startsWith('chrome://')
        );
        const targetTab = normalTabs.find(tab => tab.active) || normalTabs[0];
        if (targetTab) {
            callback(targetTab);
        } else {
            console.error('没有找到可用的标签页');
        }
    });
}

// 处理元素样式生成和应用的统一函数
async function generateAndApplyElementStyle(elementDetails, description) {
    try {
        console.log('=== generateAndApplyElementStyle 函数开始 ===');
        console.log('细节模式样式生成时间:', formatBeijingTime());
        
        // 获取当前标签页
        const tabs = await chrome.tabs.query({});
        const normalTabs = tabs.filter(tab => 
            !tab.url.startsWith('chrome-extension://') && 
            !tab.url.startsWith('chrome://')
        );
        const targetTab = normalTabs.find(tab => tab.active) || normalTabs[0];
        
        if (!targetTab) {
            throw new Error('没有找到可应用样式的标签页');
        }

        // 获取本地存储中的样式信息
        const hostname = new URL(targetTab.url).hostname;
        const storageData = await chrome.storage.local.get(hostname);
        const existingStyle = storageData[hostname];
        
        console.log('细节模式 - 现有样式信息:', existingStyle);
        
        // 重要：使用现有的 style_id，这样可以保持评分状态的一致性
        const styleId = existingStyle?.style_id || generateStyleId();
        console.log('细节模式 - 使用的样式ID:', styleId);
        console.log('细节模式 - 是否复用现有ID:', !!existingStyle?.style_id);

        // 准备发送到后端的数据
        const requestData = {
            elementDetails: elementDetails,
            description: description,
            url: targetTab.url,
            styleId: styleId,
            existingStyle: existingStyle
        };

        // 显示加载提示
        document.getElementById('loadingIndicator').style.display = 'block';
        
        // 确保内容脚本已注入
        const isInjected = await ensureContentScriptInjected(targetTab.id);
        if (!isInjected) {
            throw new Error('无法注入内容脚本');
        }

        // 发送生成样式的请求
        const response = await fetch('http://127.0.0.1:5000/api/generate_element_style', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || '生成样式失败');
        }

        console.log('细节模式 - 后端返回的样式ID:', data.styleId);

        // 应用生成的样式到页面
        await chrome.tabs.sendMessage(targetTab.id, {
            action: "applyElementStyle",
            style: data.style,
            elementPath: elementDetails.elementInfo.path,
            styleId: styleId  // 确保使用一致的样式ID
        });

        console.log('细节模式 - 样式应用完成，使用样式ID:', styleId);

        // 不再单独保存元素样式，避免破坏主样式的状态
        // 主样式的更新由 applyElementStyle 函数在 content.js 中处理

        console.log('=== generateAndApplyElementStyle 函数完成 ===');
        return { success: true };

    } catch (error) {
        console.error('生成并应用元素样式时出错:', error);
        return { success: false, error: error.message };
    } finally {
        // 隐藏加载提示
        document.getElementById('loadingIndicator').style.display = 'none';
    }
}
