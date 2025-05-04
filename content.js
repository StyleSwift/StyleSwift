// 添加一个全局变量来跟踪评分状态
let ratingSubmitted = false;

// 添加元素选择功能
let isSelecting = false;
let highlightElement = null;

// 创建一个高亮显示的元素，用于在鼠标悬停时突出显示页面元素
function createHighlightElement() {
    const el = document.createElement('div');
    // 设置高亮元素的样式
    el.style.cssText = `
        position: fixed;          /* 固定定位，不随页面滚动 */
        pointer-events: none;     /* 禁用鼠标事件，使其不影响下方元素的交互 */
        z-index: 10000;          /* 确保高亮显示在最上层 */
        border: 2px solid #007bff;  /* 蓝色边框 */
        background-color: rgba(0, 123, 255, 0.1);  /* 半透明的蓝色背景 */
        transition: all 0.2s ease;  /* 添加平滑过渡效果 */
    `;
    document.body.appendChild(el);  // 将高亮元素添加到页面
    return el;
}

// 开始元素选择模式
function startElementSelection() {
    isSelecting = true;  // 设置选择状态为开启
    highlightElement = createHighlightElement();  // 创建高亮元素
    
    // 添鼠标移动和点击事件监听器
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleElementClick);
    
    // 将鼠标样式改为十字准线，提示用户正在选择模式
    document.body.style.cursor = 'crosshair';
}

// 停止元素选择模式
function stopElementSelection() {
    isSelecting = false;  // 关闭选择状态
    // 如果存在高亮元素，则移除它
    if (highlightElement) {
        highlightElement.remove();
        highlightElement = null;
    }
    
    // 移除事件监听器
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('click', handleElementClick);
    
    // 恢复默认鼠标样式
    document.body.style.cursor = 'default';
}

// 处理鼠标移动事件
function handleMouseMove(e) {
    if (!isSelecting) return;  // 如果不在选择模式，直接返回
    
    const target = e.target;  // 获取鼠标当前悬停的元素
    // 获取目标元素的位置和尺寸信息
    const rect = target.getBoundingClientRect();
    
    // 更新高亮元素的位置和大小，使其完全覆盖目标元素
    highlightElement.style.top = `${rect.top}px`;
    highlightElement.style.left = `${rect.left}px`;
    highlightElement.style.width = `${rect.width}px`;
    highlightElement.style.height = `${rect.height}px`;
}

// 修改 getCssPath 函数，使用更可靠的定位方式
function getCssPath(element) {
    if (!element || !element.tagName) {
        return null;
    }

    // 尝试多种定位策略，优先使用更可靠的属性
    const strategies = [
        // 1. ID策略 - 保持不变，这是最可靠的
        (el) => el.id ? `#${el.id}` : null,
        
        // 2. 特殊属性策略 - 扩展以包含更多常见的标识符属性
        (el) => {
            const uniqueAttrs = ['data-testid', 'data-id', 'name', 'aria-label', 'data-element-id', 'data-automation-id'];
            for (const attr of uniqueAttrs) {
                const value = el.getAttribute(attr);
                if (value) {
                    const selector = `[${attr}="${value}"]`;
                    if (validateSelector(selector)) return selector;
                }
            }
            return null;
        },
        
        // 3. 类名策略 - 改进处理长类名列表的方法
        (el) => {
            if (el.className && typeof el.className === 'string') {
                // 优先使用单个类名、短类名或以特定前缀开头的类名
                const classNames = el.className.split(' ').filter(c => c && !c.includes(':'));
                // 尝试单独的类名
                for (const cls of classNames) {
                    if (cls && cls.length < 20) { // 避免使用过长的自动生成类名
                        const selector = `.${cls}`;
                        if (validateSelector(selector)) return selector;
                    }
                }
                
                // 尝试多个类名组合
                if (classNames.length > 1) {
                    // 按长度排序，尝试从最短的开始
                    const sortedClasses = [...classNames].sort((a, b) => a.length - b.length);
                    const shortestClass = sortedClasses[0];
                    for (let i = 1; i < Math.min(sortedClasses.length, 3); i++) {
                        const selector = `.${shortestClass}.${sortedClasses[i]}`;
                        if (validateSelector(selector)) return selector;
                    }
                }
            }
            return null;
        },
        
        // 4. 结构选择器策略 - 增加有意义的属性内容
        (el) => {
            // 尝试使用元素的文本内容作为选择器（如果是短文本）
            const text = el.textContent?.trim();
            if (text && text.length < 50 && text.length > 2) {
                // 这需要jQuery或类似库支持:contains选择器，此处仅作示例
                // 或者我们可以手动实现检查内容的函数
                const selector = `${el.tagName.toLowerCase()}:contains("${text.replace(/"/g, '\\"')}")`;
                if (document.querySelectorAll(selector).length === 1) {
                    return selector;
                }
            }
            
            // 尝试使用位置信息
            return generateStructuralSelector(el);
        }
    ];

    // 尝试每种策略
    for (const strategy of strategies) {
        const selector = strategy(element);
        if (selector && validateSelector(selector)) {
            return selector;
        }
    }

    // 如果所有策略都失败，返回结构化选择器
    return generateStructuralSelector(element);
}

// 修改验证函数，允许少量匹配
function validateSelector(selector) {
    try {
        // 尝试使用选择器查找元素
        const elements = document.querySelectorAll(selector);
        // 放宽条件，允许少量匹配（不超过3个）
        return elements.length > 0 && elements.length <= 3;
    } catch (error) {
        console.error('Invalid selector:', error);
        return false;
    }
}

// 添加一个备用的选择器生成函数
function generateFallbackSelector(element) {
    // 使用数据属性或其他唯一标识
    const uniqueAttr = element.getAttribute('data-testid') || 
                      element.getAttribute('data-id') || 
                      element.getAttribute('name');
                      
    if (uniqueAttr) {
        const selector = `[${uniqueAttr}]`;
        if (validateSelector(selector)) {
            return selector;
        }
    }

    // 使用元素的文本内容作为选择器（如果是短文本）
    const text = element.textContent?.trim();
    if (text && text.length < 50) {
        const selector = `${element.tagName.toLowerCase()}:contains("${text.replace(/"/g, '\\"')}")`;
        if (validateSelector(selector)) {
            return selector;
        }
    }

    // 返回 null 表示无法生成唯一选择器
    return null;
}

// 修改 getSelectedElementDetails 函数，使用改进的选择器生成
function getSelectedElementDetails(element) {
    // 获取主选择器
    let mainPath = getCssPath(element);
    
    // 如果主选择器无效，尝试使用备用选择器
    if (!validateSelector(mainPath)) {
        const fallbackPath = generateFallbackSelector(element);
        if (fallbackPath) {
            mainPath = fallbackPath;
        }
    }

    // 获取元素的计算样式
    const computedStyle = window.getComputedStyle(element);
    
    // 获取现有的beautifier样式
    const beautifierStyle = document.getElementById('beautifier-style');
    const existingStyles = beautifierStyle ? beautifierStyle.textContent : '';
    
    return {
        elementInfo: {
            tagName: element.tagName.toLowerCase(),
            id: element.id,
            className: element.className,
            path: mainPath
        },
        styleInfo: {
            computed: Object.fromEntries(
                Array.from(computedStyle).map(prop => [prop, computedStyle[prop]])
            ),
            existing: existingStyles
        },
        structure: element.outerHTML
    };
}

// 修改handleElementClick函数
function handleElementClick(e) {
    if (!isSelecting) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    try {
        const target = e.target;
        // 获取基本元素信息
        const elementDetails = getSelectedElementDetails(target);
        
        // 获取丰富的上下文信息
        const contextInfo = getElementContext(target);
        elementDetails.contextInfo = contextInfo;
        
        // 获取页面简化结构，重点关注目标元素所在区域
        const pageSection = identifyPageSection(target);
        const simplifiedStructure = extractSimplifiedStructure(target, pageSection);
        elementDetails.pageStructure = simplifiedStructure;
        
        // 记录用于调试
        console.log('定位元素信息(增强版):', {
            elementInfo: elementDetails.elementInfo,
            contextInfo: elementDetails.contextInfo,
            structureSummary: `收集了${Object.keys(simplifiedStructure).length}个相关节点信息`
        });
    
        // 存储选中的元素信息
        chrome.storage.local.set({
            selectedElement: {
                details: elementDetails,
                timestamp: Date.now()
            }
        }, () => {
            if (chrome.runtime.lastError) {
                console.error('存储元素信息失败:', chrome.runtime.lastError);
                alert('无法保存选中的元素信息，请重试。');
                return;
            }
            
            // 更新按钮状态
            chrome.runtime.sendMessage({
                action: "updateElementButton",
                selected: true
            }, response => {
                if (chrome.runtime.lastError) {
                    console.warn('发送消息失败，但元素已选中:', chrome.runtime.lastError);
                }
            });
        });
        
        // 发送消息到popup更新UI
        chrome.runtime.sendMessage({
            action: "elementSelected",
            elementDetails: elementDetails
        }, response => {
            if (chrome.runtime.lastError) {
                console.warn('发送元素选中通知失败:', chrome.runtime.lastError);
            }
        });
        
        // 显示用户反馈
        showFeedback(`已选中 <${target.tagName.toLowerCase()}> 元素`, 'success');
        
        stopElementSelection();
    } catch (error) {
        console.error('选择元素时出错:', error);
        showFeedback('选择元素失败: ' + error.message, 'error');
        stopElementSelection();
    }
}

// 提取简化的页面结构，重点关注目标元素
function extractSimplifiedStructure(targetElement, sectionType) {
    // 找到目标元素所在的主要容器
    const container = findRelevantContainer(targetElement, sectionType);
    if (!container) return {};
    
    // 最大收集的元素数
    const MAX_ELEMENTS = 25;
    // 已处理的元素集合（避免循环引用）
    const processedElements = new Set();
    // 结果对象
    const result = {
        container: {
            tag: container.tagName.toLowerCase(),
            id: container.id,
            className: container.className,
            role: container.getAttribute('role')
        },
        targetPath: [], // 从容器到目标元素的路径
        relevantElements: [] // 与目标相关的元素
    };
    
    // 构建从容器到目标的路径
    let current = targetElement;
    while (current && current !== container && current !== document.body) {
        result.targetPath.unshift({
            tag: current.tagName.toLowerCase(),
            id: current.id,
            className: current.className,
            textContent: current.textContent?.length > 50 
                ? current.textContent.substring(0, 50) + '...' 
                : current.textContent
        });
        current = current.parentElement;
    }
    
    // 收集相关元素（同级和周围元素）
    let count = 0;
    const queue = [container];
    while (queue.length > 0 && count < MAX_ELEMENTS) {
        const element = queue.shift();
        if (processedElements.has(element)) continue;
        processedElements.add(element);
        
        // 检查是否与目标元素相关
        if (element !== container && element !== targetElement && 
            (element.contains(targetElement) || targetElement.contains(element) || 
             areElementsRelated(element, targetElement))) {
            
            result.relevantElements.push({
                tag: element.tagName.toLowerCase(),
                id: element.id,
                className: element.className,
                textContent: element.textContent?.length > 30 
                    ? element.textContent.substring(0, 30) + '...' 
                    : element.textContent,
                styles: extractKeyStyles(element)
            });
            count++;
        }
        
        // 添加子元素到队列
        if (element.children.length > 0) {
            // 优先考虑包含目标元素的路径
            Array.from(element.children).sort((a, b) => {
                const aContainsTarget = a.contains(targetElement) ? -1 : 0;
                const bContainsTarget = b.contains(targetElement) ? -1 : 0;
                return aContainsTarget - bContainsTarget;
            }).forEach(child => queue.push(child));
        }
    }
    
    return result;
}

// 判断两个元素是否相关（近亲）
function areElementsRelated(element1, element2) {
    // 共享父元素
    if (element1.parentElement === element2.parentElement) return true;
    
    // 一个是另一个的直接子元素
    if (element1.parentElement === element2 || element2.parentElement === element1) return true;
    
    // 视觉上相近（通过位置判断）
    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();
    
    const distance = Math.sqrt(
        Math.pow((rect1.left + rect1.width/2) - (rect2.left + rect2.width/2), 2) +
        Math.pow((rect1.top + rect1.height/2) - (rect2.top + rect2.height/2), 2)
    );
    
    // 如果两元素中心点距离小于某个阈值，认为相关
    return distance < 100;
}

// 查找与目标元素相关的主要容器
function findRelevantContainer(element, sectionType) {
    // 基于区域类型查找合适的容器
    switch (sectionType) {
        case 'header':
            return document.querySelector('header') || 
                   document.querySelector('nav') ||
                   findElementByKeywords(['header', 'navigation', 'banner']);
                   
        case 'footer':
            return document.querySelector('footer') ||
                   findElementByKeywords(['footer', 'bottom']);
                   
        case 'sidebar':
            return document.querySelector('aside') ||
                   findElementByKeywords(['sidebar', 'side-menu', 'navigation']);
                   
        case 'form':
            return element.closest('form') ||
                   findElementByKeywords(['form', 'login', 'register', 'contact']);
                   
        case 'content':
        default:
            return document.querySelector('main') ||
                   document.querySelector('article') ||
                   findNearestContainer(element);
    }
}

// 通过关键词查找元素
function findElementByKeywords(keywords) {
    for (const keyword of keywords) {
        // 尝试id
        const byId = document.querySelector(`[id*="${keyword}"]`);
        if (byId) return byId;
        
        // 尝试class
        const byClass = document.querySelector(`[class*="${keyword}"]`);
        if (byClass) return byClass;
        
        // 尝试其他属性
        const byAttr = document.querySelector(`[data-*="${keyword}"], [role="${keyword}"]`);
        if (byAttr) return byAttr;
    }
    
    return null;
}

// 查找元素最近的有意义的容器
function findNearestContainer(element) {
    let current = element.parentElement;
    
    while (current && current !== document.body) {
        // 检查是否为有意义的容器
        if (['main', 'article', 'section', 'div'].includes(current.tagName.toLowerCase())) {
            // 检查是否含有足够多的子元素或有意义的ID/类名
            if (current.children.length > 3 || 
                (current.id && current.id.length > 0) ||
                (current.className && current.className.length > 0)) {
                return current;
            }
        }
        current = current.parentElement;
    }
    
    return document.body; // 默认返回body
}

// 在文件开头添加上下文检查函数
function isExtensionContextValid() {
    try {
        // 尝试访问 chrome.runtime
        return chrome.runtime && chrome.runtime.id;
    } catch (e) {
        return false;
    }
}

// 监听来自扩展程序的消息
function initializeContentScript() {
    const maxRetries = 5; // 增加最大重试次数
    let retryCount = 0;
    const retryDelay = 800; // 增加重试间隔

    function tryInitialize() {
        if (!isExtensionContextValid()) {
            console.warn('Extension context is invalid during initialization, attempt:', retryCount + 1);
            
            if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(tryInitialize, retryDelay);
                return;
            } else {
                console.error('Extension initialization failed after', maxRetries, 'attempts');
                return;
            }
        }

        try {
            chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
                if (request.action === "startElementSelection") {
                    try {
                        console.log('Starting element selection...');
                        startElementSelection();
                        sendResponse({ success: true });
                    } catch (error) {
                        console.error('Error in startElementSelection:', error);
                        sendResponse({ success: false, error: error.message });
                    }
                    return true;
                }

                // 添加错误处理
                try {
                    if (!isExtensionContextValid()) {
                        throw new Error('Extension context invalidated');
                    }

                    if (request.action === "ping") {
                        sendResponse({status: "ok"});
                    } else if (request.action === "applyElementStyle") {
                        const result = applyElementStyle(request.style, request.elementPath);
                        sendResponse(result);
                    } else if (request.action === "applyStyle") {
                        applyStyle(request.style, request.styleId);
                        sendResponse({success: true});
                    } else if (request.action === "getPageStructure") {
                        const pageStructure = getPageStructure();
                        sendResponse({pageStructure: pageStructure, url: window.location.href});
                    } else if (request.action === "removeAllStyles") {
                        const success = removeAllAppliedStyles();
                        sendResponse({success: success});
                    }
                } catch (error) {
                    console.error('Content script error:', error);
                    sendResponse({ success: false, error: error.message });
                }
                return true;
            });

            // 添加错误处理的监听器
            chrome.runtime.onMessageExternal?.addListener(() => {
                if (!isExtensionContextValid()) {
                    console.warn('Extension context invalidated');
                    return;
                }
            });

            // 监听扩展上下文失效
            chrome.runtime.onSuspend?.addListener(() => {
                console.warn('Extension is being suspended');
            });

            // 确保在页面加载和DOM变化时检查并应用样式
            checkAndApplyStyle();

            // 监听DOM变化
            const observer = new MutationObserver(() => {
                checkAndApplyStyle();
            });
            
            observer.observe(document.body, { 
                childList: true, 
                subtree: true 
            });

            // 监听存储变化
            chrome.storage.onChanged.addListener((changes, namespace) => {
                if (namespace === 'local' && changes[window.location.hostname]) {
                    checkAndApplyStyle();
                }
            });

            console.log('Content script initialized');

            // 重置评分状态
            ratingSubmitted = false;

            // 确保在初始化完成后再检查样式
            setTimeout(checkAndApplyStyle, 100);

            // 添加恢复机制
            window.addEventListener('error', function(event) {
                console.error('Global error caught:', event.error);
                // 尝试恢复关键功能
                if (isSelecting) {
                    stopElementSelection();
                }
            });

            console.log('Content script initialized successfully');

        } catch (error) {
            console.error('Error in initializeContentScript:', error);
            
            if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(tryInitialize, retryDelay * retryCount); // 递增延迟
            }
        }
    }

    tryInitialize();
}

// 应用样式
function applyStyle(style, styleId) {
    const newStyleElement = document.createElement('style');
    newStyleElement.id = 'beautifier-style';
    newStyleElement.textContent = style;
    newStyleElement.setAttribute('data-style-id', styleId);  // 添加 styleId 作为属性

    const oldStyleElement = document.getElementById('beautifier-style');
    if (oldStyleElement && oldStyleElement !== newStyleElement) {
        oldStyleElement.remove();
    }

    document.head.appendChild(newStyleElement);

    chrome.storage.local.set({
        [window.location.hostname]: {
            style_code: style,
            style_id: styleId
        }
    });

    chrome.storage.local.remove('defaultStyle');

    // 在应用新样式后，添加评分容器
    if (!document.getElementById('beautifier-rating')) {
        addRatingStars();
    }
}

// 移除所有应用的样式
function removeAllAppliedStyles() {
    try {
        // 只移除由扩展添加的样式元素
        const styleElement = document.getElementById('beautifier-style');
        if (styleElement) {
            styleElement.remove();
        }

        // 移除所有由扩展添加的类
        document.body.classList.remove('beautifier-applied');

        // 移除评分容器
        const ratingContainer = document.getElementById('beautifier-rating');
        if (ratingContainer) {
            ratingContainer.remove();
        }

        // 从 chrome.storage.local 中移除该网站的样式
        chrome.storage.local.remove(window.location.hostname, function() {
            if (chrome.runtime.lastError) {
                console.error('移除存储的样式时出错:', chrome.runtime.lastError);
                return;
            }
            console.log('所有应用的样式已被移除');
        });

        return true; // 表示成功移除样式
    } catch (error) {
        console.error('移除样式时出错:', error);
        return false; // 表示移除样式失败
    }
}

// 检查并应用样式
async function checkAndApplyStyle() {
    try {
        const hostname = window.location.hostname;
        const data = await chrome.storage.local.get(hostname);
        
        if (data[hostname]) {
            const styleId = data[hostname].style_id;
            const styleCode = data[hostname].style_code;
            const mode = data[hostname].mode;

            // 创建或更新样式元素
            let styleElement = document.getElementById('beautifier-style');
            if (!styleElement) {
                styleElement = document.createElement('style');
                styleElement.id = 'beautifier-style';
                document.head.appendChild(styleElement);
            }

            // 应用样式
            styleElement.textContent = styleCode;
            styleElement.setAttribute('data-style-id', styleId);
            styleElement.setAttribute('data-mode', mode || 'site');

            console.log('Applied stored style for:', hostname, {
                styleId,
                mode
            });
        }
    } catch (error) {
        console.error('Error checking and applying style:', error);
    }
}

// 获取页面结构和关键CSS
function getPageStructure() {
    // 截断文本,超过最大长度时添加省略号
    function truncateText(text, maxLength = 50) {
        if (text.length <= maxLength) {
            return text;
        }
        return text.slice(0, maxLength) + "...";
    }

    // 提取元素的关键CSS
    function getKeyCSS(element) {
        const computedStyle = window.getComputedStyle(element);
        const keyProperties = [
            'display', 'position', 'float', 'clear',
            'flex', 'flex-direction', 'justify-content', 'align-items',
            'grid', 'grid-template-columns', 'grid-template-rows',
            'width', 'height', 'max-width', 'max-height',
            'margin', 'padding', 'border',
            'background-color', 'color', 'font-size', 'font-weight'
        ];

        return keyProperties.reduce((css, prop) => {
            const value = computedStyle.getPropertyValue(prop);
            if (value && value !== 'none' && value !== 'normal' && value !== '0px') {
                css[prop] = value;
            }
            return css;
        }, {});
    }

    // 提取页面的最小结构和关键CSS
    function extractMinimalStructureAndCSS(element, seenElements = new Set()) {
        // 处理文本节点
        if (element.nodeType === Node.TEXT_NODE) {
            return element.textContent.trim();
        }

        // 忽略非元素节点
        if (element.nodeType !== Node.ELEMENT_NODE) {
            return "";
        }

        // 创建元素的唯一标识
        const elementStructure = [element.tagName, ...Array.from(element.attributes).map(attr => `${attr.name}="${attr.value}"`)].join('');
        
        // 跳过重复元素
        if (seenElements.has(elementStructure)) {
            return "";  // Skip duplicate elements
        }
        seenElements.add(elementStructure);

        // 提取重要属性
        const importantAttrs = ['id', 'class', 'style', 'title'];
        const attributes = Array.from(element.attributes)
            .filter(attr => importantAttrs.includes(attr.name))
            .map(attr => `${attr.name}="${attr.value}"`)
            .join(' ');

        // 提取关键CSS
        const keyCSS = getKeyCSS(element);
        const cssString = Object.entries(keyCSS)
            .map(([prop, value]) => `${prop}:${value}`)
            .join(';');

        // 提取元素信息
        const elementInfo = getElementInfo(element);

        // 构建开始标签，包含关键CSS和元素信息
        const openingTag = `<${element.tagName.toLowerCase()} ${attributes} style="${cssString}" data-info='${JSON.stringify(elementInfo)}'>`;
        
        // 处理子节点
        const content = Array.from(element.childNodes)
            .map(child => {
                // 跳过注释节点
                if (child.nodeType === Node.COMMENT_NODE) {
                    return "";  // Skip comments
                }
                // 递归处理重要的子元素
                if (child.nodeType === Node.ELEMENT_NODE && ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                                                         'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'a', 'img', 
                                                         'form', 'input', 'button', 'section', 'article', 'nav', 
                                                         'header', 'footer', 'aside', 'main', 'center', 'blockquote'].includes(child.tagName.toLowerCase())) {
                    return extractMinimalStructureAndCSS(child, seenElements);
                }
                // 处理文本节点
                if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
                    return truncateText(child.textContent.trim());
                }
                return "";
            })
            .join('');

        // 构建结束标签
        const closingTag = `</${element.tagName.toLowerCase()}>`;
        return `${openingTag}${content}${closingTag}`;
    }

    // 移除包含 shadow root 的 div 元素
    function removeShadowRootDivs() {
        const allDivs = document.querySelectorAll('div');

        allDivs.forEach(div => {
            if (div.shadowRoot) {
                div.parentNode.removeChild(div);
            }
        });
    }

    // 先移除包含 shadow root 的 div 元素
    removeShadowRootDivs();

    // 获取视口尺寸
    const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
    };

    // 取body元素并提取结构和关键CSS
    const body = document.body;
    const pageStructure = body ? extractMinimalStructureAndCSS(body) : "No body found in the HTML";

    return {
        viewport: viewport,
        structure: pageStructure
    };
}

// 在页面加载时检查是否有缓存的样式
chrome.storage.local.get(window.location.hostname, function(data) {
    if (data[window.location.hostname]) {
        const { style_code, style_id } = data[window.location.hostname];
        if (style_code) {
            applyStyle(style_code, style_id);
        }
    }
});

// 添加评分星星
function addRatingStars() {
    const styleElement = document.getElementById('beautifier-style');
    const styleId = styleElement ? styleElement.getAttribute('data-style-id') : null;

    // 检查这个样式是否已经被评分过
    chrome.storage.local.get(['ratedStyles'], function(result) {
        const ratedStyles = result.ratedStyles || {};
        if (styleId && ratedStyles[styleId]) {
            // 如果这个样式已经被评分过，不添加评分容器
            return;
        }

        // 如果评分容器已存在，不再添加
        if (document.getElementById('beautifier-rating')) {
            return;
        }

        // 创建评分容器
        const ratingContainer = document.createElement('div');
        ratingContainer.id = 'beautifier-rating';

        // 创建 Shadow DOM
        const shadow = ratingContainer.attachShadow({mode: 'closed'});

        // 添加样式到 Shadow DOM
        const style = document.createElement('style');
        style.textContent = getRatingStyles();
        shadow.appendChild(style);

        // 添加内容到 Shadow DOM
        const content = document.createElement('div');
        content.innerHTML = `
            <ul class="feedback">
                <li class="angry" data-rating="1">
                    <div>
                        <svg class="eye left"><use xlink:href="#eye"></use></svg>
                        <svg class="eye right"><use xlink:href="#eye"></use></svg>
                        <svg class="mouth"><use xlink:href="#mouth"></use></svg>
                    </div>
                </li>
                <li class="sad" data-rating="2">
                    <div>
                        <svg class="eye left"><use xlink:href="#eye"></use></svg>
                        <svg class="eye right"><use xlink:href="#eye"></use></svg>
                        <svg class="mouth"><use xlink:href="#mouth"></use></svg>
                    </div>
                </li>
                <li class="ok" data-rating="3">
                    <div></div>
                </li>
                <li class="good" data-rating="4">
                    <div>
                        <svg class="eye left"><use xlink:href="#eye"></use></svg>
                        <svg class="eye right"><use xlink:href="#eye"></use></svg>
                        <svg class="mouth"><use xlink:href="#mouth"></use></svg>
                    </div>
                </li>
                <li class="happy" data-rating="5">
                    <div>
                        <svg class="eye left"><use xlink:href="#eye"></use></svg>
                        <svg class="eye right"><use xlink:href="#eye"></use></svg>
                    </div>
                </li>
            </ul>
            <svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
                <symbol xmlns="http://www.w3.org/2000/svg" viewBox="0 0 7 4" id="eye">
                    <path d="M1,1 C1.83333333,2.16666667 2.66666667,2.75 3.5,2.75 C4.33333333,2.75 5.16666667,2.16666667 6,1"></path>
                </symbol>
                <symbol xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 7" id="mouth">
                    <path d="M1,5.5 C3.66666667,2.5 6.33333333,1 9,1 C11.6666667,1 14.3333333,2.5 17,5.5"></path>
                </symbol>
            </svg>
        `;
        shadow.appendChild(content);

        // 将评分容器添加到页面
        document.body.appendChild(ratingContainer);

        // 为每个表情添加点击事件
        const feedbackItems = shadow.querySelectorAll('.feedback li');
        feedbackItems.forEach(item => {
            item.addEventListener('click', function() {
                const rating = this.dataset.rating;
                submitRating(styleId, rating);
                feedbackItems.forEach(i => i.classList.remove('active'));
                this.classList.add('active');
            });
        });
    });
}

// 添加一个新函数来移除评分容器
function removeRatingContainer() {
    const ratingContainer = document.getElementById('beautifier-rating');
    if (ratingContainer) {
        ratingContainer.remove();
    }
    // 移除相关的样式
    const ratingStyle = document.getElementById('beautifier-rating-style');
    if (ratingStyle) {
        ratingStyle.remove();
    }
}

// 改提交评分函数
function submitRating(styleId, rating) {
    // 发送评分到后台
    chrome.runtime.sendMessage({
        action: "submitRating",
        rating: rating,
        styleId: styleId
    }, function(response) {
        if (response.success) {
            // 评分成功
            showFeedback('感谢您的评分！', 'success');
            // 记录这个样式已被评分
            chrome.storage.local.get(['ratedStyles'], function(result) {
                const ratedStyles = result.ratedStyles || {};
                ratedStyles[styleId] = true;
                chrome.storage.local.set({ratedStyles: ratedStyles}, function() {
                    console.log('样式评分状态已更新');
                });
            });
            // 在一段时间后移除评分容器
            setTimeout(removeRatingContainer, 3000);
        } else {
            // 评分失败
            showFeedback('评分提交失败，请稍后再试。', 'error');
        }
    });
}

// 新增函数：显示反馈信息
function showFeedback(message, type = 'info') {
    // 创建或获取反馈元素
    let feedback = document.getElementById('beautifier-feedback');
    if (!feedback) {
        feedback = document.createElement('div');
        feedback.id = 'beautifier-feedback';
        feedback.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 15px;
            border-radius: 4px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10000;
            transition: opacity 0.3s ease;
            opacity: 0;
        `;
        document.body.appendChild(feedback);
    }

    // 设置消息类型的样式
    switch (type) {
        case 'success':
            feedback.style.backgroundColor = '#4CAF50';
            feedback.style.color = 'white';
            break;
        case 'error':
            feedback.style.backgroundColor = '#F44336';
            feedback.style.color = 'white';
            break;
        case 'warning':
            feedback.style.backgroundColor = '#FF9800';
            feedback.style.color = 'white';
            break;
        default:
            feedback.style.backgroundColor = '#2196F3';
            feedback.style.color = 'white';
    }

    // 设置消息内容并显示
    feedback.textContent = message;
    feedback.style.opacity = '1';

    // 3秒后自动隐藏
    setTimeout(() => {
        feedback.style.opacity = '0';
    }, 3000);
}

// 确保样式优先级
function ensureStylePriority() {
    const styleElement = document.getElementById('beautifier-style');
    if (styleElement) {
        // 将样式元素移动到 <head> 的最后,确保它有最高优先级
        document.head.appendChild(styleElement);
    }
}

// 获取元素信息的函数
function getElementInfo(element) {
    const rect = element.getBoundingClientRect();
    return {
        tag: element.tagName,
        id: element.id,
        class: element.className,
        x: Math.round(rect.left),
        y: Math.round(rect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
    };
}

// 确保在页面加载完成后初始化
if (document.readyState === 'loading') {
    // 如果页面还在加载,等待DOMContentLoaded事件
    document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
    // 如果页面已经加载完成,直接初始化
    initializeContentScript();
}

// 获取评分样式的函数
function getRatingStyles() {
    return `
        :host {
            position: fixed !important;
            bottom: 20px !important;
            right: 20px !important;
            background-color: rgb(255 255 255 / 20%) !important;
            color: #333 !important;
            padding: 10px !important;
            border-radius: 5px !important;
            font-family: 'Roboto', Arial, sans-serif !important;
            z-index: 999999 !important;
        }
        .feedback {
            --normal: #ECEAF3;
            --normal-shadow: #D9D8E3;
            --normal-mouth: #9795A4;
            --normal-eye: #595861;
            --active: #F8DA69;
            --active-shadow: #F4B555;
            --active-mouth: #F05136;
            --active-eye: #313036;
            --active-tear: #76b5e7;
            --active-shadow-angry: #e94f1d;
            margin: 0;
            padding: 0;
            list-style: none;
            display: flex;
        }
        .feedback li {
            position: relative;
            border-radius: 50%;
            background: var(--sb, var(--normal));
            box-shadow: inset 3px -3px 4px var(--sh, var(--normal-shadow));
            transition: background .4s, box-shadow .4s, transform .3s;
            -webkit-tap-highlight-color: transparent;
        }
        .feedback li:not(:last-child) {
            margin-right: 20px;
        }
        .feedback li div {
            width: 40px;
            height: 40px;
            position: relative;
            transform: perspective(240px) translateZ(4px);
        }
        .feedback li div svg,
        .feedback li div:before,
        .feedback li div:after {
            display: block;
            position: absolute;
            left: var(--l, 9px);
            top: var(--t, 13px);
            width: var(--w, 8px);
            height: var(--h, 2px);
            transform: rotate(var(--r, 0deg)) scale(var(--sc, 1)) translateZ(0);
        }
        .feedback li div svg {
            fill: none;
            stroke: var(--s);
            stroke-width: 2px;
            stroke-linecap: round;
            stroke-linejoin: round;
            transition: stroke .4s;
        }
        .feedback li div svg.eye {
            --s: var(--e, var(--normal-eye));
            --t: 17px;
            --w: 7px;
            --h: 4px;
        }
        .feedback li div svg.eye.right {
            --l: 23px;
        }
        .feedback li div svg.mouth {
            --s: var(--m, var(--normal-mouth));
            --l: 11px;
            --t: 23px;
            --w: 18px;
            --h: 7px;
        }
        .feedback li div:before,
        .feedback li div:after {
            content: '';
            z-index: var(--zi, 1);
            border-radius: var(--br, 1px);
            background: var(--b, var(--e, var(--normal-eye)));
            transition: background .4s;
        }
        .feedback li.angry {
            --step-1-rx: -24deg;
            --step-1-ry: 20deg;
            --step-2-rx: -24deg;
            --step-2-ry: -20deg;
        }
        .feedback li.angry div:before {
            --r: 20deg;
        }
        .feedback li.angry div:after {
            --l: 23px;
            --r: -20deg;
        }
        .feedback li.angry div svg.eye {
            stroke-dasharray: 4.55;
            stroke-dashoffset: 8.15;
        }
        .feedback li.angry.active {
            animation: angry 1s linear;
        }
        .feedback li.angry.active div:before {
            --middle-y: -2px;
            --middle-r: 22deg;
            animation: toggle .8s linear forwards;
        }
        .feedback li.angry.active div:after {
            --middle-y: 1px;
            --middle-r: -18deg;
            animation: toggle .8s linear forwards;
        }
        .feedback li.sad {
            --step-1-rx: 20deg;
            --step-1-ry: -12deg;
            --step-2-rx: -18deg;
            --step-2-ry: 14deg;
        }
        .feedback li.sad div:before,
        .feedback li.sad div:after {
            --b: var(--active-tear);
            --sc: 0;
            --w: 5px;
            --h: 5px;
            --t: 15px;
            --br: 50%;
        }
        .feedback li.sad div:after {
            --l: 25px;
        }
        .feedback li.sad div svg.eye {
            --t: 16px;
        }
        .feedback li.sad div svg.mouth {
            --t: 24px;
            stroke-dasharray: 9.5;
            stroke-dashoffset: 33.25;
        }
        .feedback li.sad.active div:before,
        .feedback li.sad.active div:after {
            animation: tear .6s linear forwards;
        }
        .feedback li.ok {
            --step-1-rx: 4deg;
            --step-1-ry: -22deg;
            --step-1-rz: 6deg;
            --step-2-rx: 4deg;
            --step-2-ry: 22deg;
            --step-2-rz: -6deg;
        }
        .feedback li.ok div:before {
            --l: 12px;
            --t: 17px;
            --h: 4px;
            --w: 4px;
            --br: 50%;
            box-shadow: 12px 0 0 var(--e, var(--normal-eye));
        }
        .feedback li.ok div:after {
            --l: 13px;
            --t: 26px;
            --w: 14px;
            --h: 2px;
            --br: 1px;
            --b: var(--m, var(--normal-mouth));
        }
        .feedback li.ok.active div:before {
            --middle-s-y: .35;
            animation: toggle .2s linear forwards;
        }
        .feedback li.ok.active div:after {
            --middle-s-x: .5;
            animation: toggle .7s linear forwards;
        }
        .feedback li.good {
            --step-1-rx: -14deg;
            --step-1-rz: 10deg;
            --step-2-rx: 10deg;
            --step-2-rz: -8deg;
        }
        .feedback li.good div:before {
            --b: var(--m, var(--normal-mouth));
            --w: 5px;
            --h: 5px;
            --br: 50%;
            --t: 22px;
            --zi: 0;
            opacity: .5;
            box-shadow: 16px 0 0 var(--b);
            filter: blur(2px);
        }
        .feedback li.good div:after {
            --sc: 0;
        }
        .feedback li.good div svg.eye {
            --t: 15px;
            --sc: -1;
            stroke-dasharray: 4.55;
            stroke-dashoffset: 8.15;
        }
        .feedback li.good div svg.mouth {
            --t: 22px;
            --sc: -1;
            stroke-dasharray: 13.3;
            stroke-dashoffset: 23.75;
        }
        .feedback li.good.active div svg.mouth {
            --middle-y: 1px;
            --middle-s: -1;
            animation: toggle .8s linear forwards;
        }
        .feedback li.happy div {
            --step-1-rx: 18deg;
            --step-1-ry: 24deg;
            --step-2-rx: 18deg;
            --step-2-ry: -24deg;
        }
        .feedback li.happy div:before {
            --sc: 0;
        }
        .feedback li.happy div:after {
            --b: var(--m, var(--normal-mouth));
            --l: 11px;
            --t: 23px;
            --w: 18px;
            --h: 8px;
            --br: 0 0 8px 8px;
        }
        .feedback li.happy div svg.eye {
            --t: 14px;
            --sc: -1;
        }
        .feedback li.happy.active div:after {
            --middle-s-x: .95;
            --middle-s-y: .75;
            animation: toggle .8s linear forwards;
        }
        .feedback li:not(.active) {
            cursor: pointer;
        }
        .feedback li:not(.active):active {
            transform: scale(.925);
        }
        .feedback li.active {
            --sb: var(--active);
            --sh: var(--active-shadow);
            --m: var(--active-mouth);
            --e: var(--active-eye);
        }
        .feedback li.active div {
            animation: shake .8s linear forwards;
        }
        @keyframes shake {
            30% {
                transform: perspective(240px) rotateX(var(--step-1-rx, 0deg)) rotateY(var(--step-1-ry, 0deg)) rotateZ(var(--step-1-rz, 0deg)) translateZ(10px);
            }
            60% {
                transform: perspective(240px) rotateX(var(--step-2-rx, 0deg)) rotateY(var(--step-2-ry, 0deg)) rotateZ(var(--step-2-rz, 0deg)) translateZ(10px);
            }
            100% {
                transform: perspective(240px) translateZ(4px);
            }
        }
        @keyframes tear {
            0% {
                opacity: 0;
                transform: translateY(-2px) scale(0) translateZ(0);
            }
            50% {
                transform: translateY(12px) scale(.6, 1.2) translateZ(0);
            }
            20%, 80% {
                opacity: 1;
            }
            100% {
                opacity: 0;
                transform: translateY(24px) translateX(4px) rotateZ(-30deg) scale(.7, 1.1) translateZ(0);
            }
        }
        @keyframes toggle {
            50% {
                transform: translateY(var(--middle-y, 0)) scale(var(--middle-s-x, var(--middle-s, 1)), var(--middle-s-y, var(--middle-s, 1))) rotate(var(--middle-r, 0deg));
            }
        }
        @keyframes angry {
            40% {
                background: var(--active);
            }
            45% {
                box-shadow: inset 3px -3px 4px var(--active-shadow), inset 0 8px 10px var(--active-shadow-angry);
            }
        }
    `;
}

// 添加一个新的选择器生成函数 - 结构选择器
function generateStructuralSelector(element) {
    if (!element || element === document.documentElement) {
        return null;
    }

    // 基本选择器 - 标签名
    let tagName = element.tagName.toLowerCase();
    
    // 如果元素有ID，这是最可靠的方式
    if (element.id) {
        return `#${element.id}`;
    }

    // 尝试基于属性构建选择器
    for (const attr of ['role', 'type', 'name', 'aria-label', 'data-element-id', 'data-automation-id']) {
        const value = element.getAttribute(attr);
        if (value) {
            const selector = `[${attr}="${value}"]`;
            if (validateSelector(selector)) return selector;
        }
    }

    // 如果元素有明确的文本内容，使用内容选择器
    const text = element.textContent?.trim();
    if (text && text.length < 50 && text.length > 2) {
        const selector = `${tagName}:contains("${text.replace(/"/g, '\\"')}")`;
        if (validateSelector(selector)) return selector;
    }

    // 获取父元素的路径
    const parent = element.parentElement;
    if (!parent) {
        return tagName;
    }

    const parentPath = generateStructuralSelector(parent);
    
    // 确定元素在同类型兄弟元素中的位置
    const siblings = Array.from(parent.children).filter(child => 
        child.tagName.toLowerCase() === tagName
    );

    if (siblings.length === 1) {
        return `${parentPath} > ${tagName}`;
    }

    // 找到元素的索引
    const index = siblings.indexOf(element) + 1;
    return `${parentPath} > ${tagName}:nth-of-type(${index})`;
}

// 修改 sanitizeSelector 函数
function sanitizeSelector(selector) {
    try {
        // 记录原始选择器用于调试
        console.log('Original selector:', selector);
        
        // 尝试使用原始选择器
        const element = document.querySelector(selector);
        if (element) {
            // 如果能找到元素，生成结构化选择器
            const structuralSelector = generateStructuralSelector(element);
            if (structuralSelector) {
                console.log('Generated structural selector:', structuralSelector);
                return structuralSelector;
            }
        }

        // 如果原始选择器失败，尝试清理并使用最后一部分
        const lastPart = selector.split('>').pop().trim();
        const element2 = document.querySelector(lastPart);
        if (element2) {
            const structuralSelector = generateStructuralSelector(element2);
            if (structuralSelector) {
                console.log('Generated structural selector from last part:', structuralSelector);
                return structuralSelector;
            }
        }

        // 如果还是失败，返回 null
        console.error('Failed to generate valid selector');
        return null;

    } catch (error) {
        console.error('Selector processing failed:', error);
        return null;
    }
}

// 修改 formatElementStyle 函数（新增）
function formatElementStyle(selector, style) {
    // 处理样式字符串，确保每个属性都有 !important
    const styleLines = style.split(';').filter(line => line.trim());
    const formattedStyles = styleLines.map(line => {
        line = line.trim();
        if (!line) return '';
        
        // 如果行已经包含 !important，直接返回
        if (line.includes('!important')) {
            return line.endsWith(';') ? line : line + ';';
        }
        
        // 添加 !important
        return line.endsWith(';') ? 
            line.slice(0, -1) + ' !important;' : 
            line + ' !important;';
    });
    
    // 构建完整的样式规则
    return `${selector} {\n    ${formattedStyles.join('\n    ')}\n}`;
}

// 修改 applyElementStyle 函数中的相关部分
function applyElementStyle(style, elementPath, styleId = null) {
    try {
        console.log('Attempting to apply style to:', {
            elementPath,
            style: style.substring(0, 100) + '...',
            styleId
        });

        // 添加进度反馈
        chrome.runtime.sendMessage({
            action: "updateStatus",
            status: "查找元素中..."
        });

        // 尝试使用多种选择策略
        let targetElement = null;
        let finalSelector = elementPath;
        
        // 生成多个选择器候选（利用我们的增强选择器生成器）
        const allSelectors = generateMultipleSelectorCandidates(elementPath);
        
        // 记录尝试的选择器
        console.log('Trying selectors:', allSelectors);
        
        // 尝试所有可能的选择器
        for (const selector of allSelectors) {
            targetElement = trySelectElement(selector);
            if (targetElement) {
                finalSelector = selector;
                console.log('Found element with selector:', selector);
                break;
            }
        }

        // 依然找不到元素时的处理
        if (!targetElement) {
            console.warn('Element not found with any selector, using original path');
            
            // 虽然现在找不到，但未来DOM可能会出现匹配的元素，仍然应用样式
            const hostname = window.location.hostname;
            
            // 创建或更新样式元素
            let styleElement = document.getElementById('beautifier-style');
            if (!styleElement) {
                styleElement = document.createElement('style');
                styleElement.id = 'beautifier-style';
                document.head.appendChild(styleElement);
            }
            
            // 增加注释，说明暂时未找到元素
            const specificStyle = `/* 警告: 未找到元素，但仍然应用样式 ${elementPath} */\n${elementPath} {\n${style}\n}`;
            
            getAndUpdateStyle(hostname, specificStyle, styleId, styleElement);
            
                chrome.runtime.sendMessage({
                    action: "updateStatus",
                    status: "未找到元素，但样式已应用（将在元素出现时生效）"
                });
            
            return { success: true, warning: "元素未找到，样式已应用但可能不会立即生效" };
            }

        // 找到元素，创建预览
        showStylePreview(targetElement, style);
        
            chrome.runtime.sendMessage({
                action: "updateStatus",
                status: "已找到元素，正在应用样式..."
            });

        // 获取存储的样式并更新
        const hostname = window.location.hostname;

        // 创建或更新样式元素
        let styleElement = document.getElementById('beautifier-style');
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.id = 'beautifier-style';
            document.head.appendChild(styleElement);
        }

        // 格式化和应用样式
        const specificStyle = formatElementStyle(finalSelector, style);
        
        getAndUpdateStyle(hostname, specificStyle, styleId, styleElement);
            
        // 隐藏预览
        setTimeout(() => {
            hideStylePreview();
            
                chrome.runtime.sendMessage({
                    action: "updateStatus",
                    status: "样式应用成功！"
                });
        }, 500);

        return { success: true };
    } catch (error) {
        console.error('应用元素样式时出错:', error);
        hideStylePreview();
        chrome.runtime.sendMessage({
            action: "updateStatus",
            status: "应用样式失败：" + error.message
        });
        return { success: false, error: error.message };
    }
}

// 修改 showStylePreview 函数中的样式应用部分
function showStylePreview(element, style) {
    // 创建预览覆盖层
    const preview = document.createElement('div');
    preview.id = 'beautifier-style-preview';
    
    // 获取元素位置和尺寸
    const rect = element.getBoundingClientRect();
    
    // 设置预览样式
    preview.style.cssText = `
        position: fixed;
        z-index: 999999;
        pointer-events: none;
        transition: all 0.3s ease;
        background-color: rgba(0, 123, 255, 0.2);
        border: 2px solid rgba(0, 123, 255, 0.5);
        box-shadow: 0 0 10px rgba(0, 123, 255, 0.3);
    `;
    
    // 根据位置设置大小和位置
    preview.style.top = `${rect.top}px`;
    preview.style.left = `${rect.left}px`;
    preview.style.width = `${rect.width}px`;
    preview.style.height = `${rect.height}px`;
    
    // 添加到页面
    document.body.appendChild(preview);
    
    // 创建临时样式应用
    const tempStyle = document.createElement('style');
    tempStyle.id = 'beautifier-preview-style';
    
    // 解析style字符串为CSS属性对象
    const styleObj = parseStyleString(style);
    
    // 创建带有!important的预览样式
    let previewCss = '';
    for (const prop in styleObj) {
        previewCss += `${prop}: ${styleObj[prop]} !important;\n`;
    }
    
    // 应用临时样式
    tempStyle.textContent = `
        #beautifier-style-preview {
            ${previewCss}
        }
    `;
    document.head.appendChild(tempStyle);
}

// 隐藏样式预览
function hideStylePreview() {
    const preview = document.getElementById('beautifier-style-preview');
    if (preview) {
        preview.remove();
    }
    
    const tempStyle = document.getElementById('beautifier-preview-style');
    if (tempStyle) {
        tempStyle.remove();
    }
}

// 解析样式字符串为对象
function parseStyleString(styleStr) {
    const result = {};
    const declarations = styleStr.split(';');
    
    for (let declaration of declarations) {
        declaration = declaration.trim();
        if (!declaration) continue;
        
        const colonPos = declaration.indexOf(':');
        if (colonPos === -1) continue;
        
        const property = declaration.substring(0, colonPos).trim();
        const value = declaration.substring(colonPos + 1).trim();
        
        if (property && value) {
            result[property] = value;
        }
    }
    
    return result;
}

// 从存储中获取现有样式并更新
function getAndUpdateStyle(hostname, newStyle, styleId, styleElement) {
    chrome.storage.local.get(hostname, async (data) => {
        try {
            let combinedStyle = newStyle;
            let finalStyleId = styleId || `style_${Date.now()}`;
            
            if (data[hostname] && data[hostname].style_code) {
                const existingStyle = data[hostname].style_code;
                
                // 移除可能存在的旧样式（针对同一元素）
                const cleanedExistingStyle = removeElementStyle(existingStyle, newStyle.split('{')[0].trim());
                
                // 合并样式
                combinedStyle = `${cleanedExistingStyle}\n\n${newStyle}`;
            }
            
            // 更新本地存储
            await chrome.storage.local.set({
                [hostname]: {
                    style_code: combinedStyle,
                    style_id: finalStyleId,
                    mode: 'element'
                }
            });

            // 应用样式
            styleElement.textContent = combinedStyle;
            styleElement.setAttribute('data-style-id', finalStyleId);
            styleElement.setAttribute('data-mode', 'element');
            
            console.log('Style applied successfully');
        } catch (storageError) {
            console.error('Storage operation failed:', storageError);
            throw storageError;
        }
    });
}

// 生成多个选择器候选
function generateMultipleSelectorCandidates(originalSelector) {
    // 基本选择器
    const selectors = [originalSelector];
    
    try {
        // 尝试不同结构的选择器
        if (originalSelector.includes('#')) {
            // ID选择器，尝试单独使用ID
            const idMatch = originalSelector.match(/#[a-zA-Z0-9_-]+/);
            if (idMatch) {
                selectors.push(idMatch[0]);
            }
        }
        
        if (originalSelector.includes('.')) {
            // 类选择器
            const classMatches = originalSelector.match(/\.[a-zA-Z0-9_-]+/g);
            if (classMatches) {
                // 单独使用每个类
                classMatches.forEach(cls => selectors.push(cls));
                
                // 如果有多个类，尝试组合
                if (classMatches.length > 1) {
                    selectors.push(classMatches.join(''));
                }
            }
        }
        
        // 提取标签名
        const tagMatch = originalSelector.match(/^[a-zA-Z0-9]+/);
        if (tagMatch) {
            const tag = tagMatch[0];
            selectors.push(tag);
            
            // 标签加类名
            if (originalSelector.includes('.')) {
                const classMatches = originalSelector.match(/\.[a-zA-Z0-9_-]+/g);
                if (classMatches && classMatches.length > 0) {
                    selectors.push(tag + classMatches[0]);
                }
            }
        }
        
        // 属性选择器
        if (originalSelector.includes('[')) {
            const attrMatches = originalSelector.match(/\[[^\]]+\]/g);
            if (attrMatches) {
                attrMatches.forEach(attr => selectors.push(attr));
                
                // 标签加属性
                if (tagMatch) {
                    selectors.push(tag + attrMatches[0]);
                }
            }
        }
        
        // 结构选择器变体
        if (originalSelector.includes('>')) {
            // 尝试父元素+子元素
            const parts = originalSelector.split('>').map(p => p.trim());
            if (parts.length >= 2) {
                // 最后两部分
                selectors.push(`${parts[parts.length-2]} > ${parts[parts.length-1]}`);
                
                // 子元素
                selectors.push(parts[parts.length-1]);
            }
        }
        
        // 深度查询
        const deepParts = originalSelector.split(/\s+/); // 空白分隔
        if (deepParts.length > 1) {
            // 最后部分
            selectors.push(deepParts[deepParts.length-1]);
            
            // 最后两部分
            if (deepParts.length >= 2) {
                selectors.push(`${deepParts[deepParts.length-2]} ${deepParts[deepParts.length-1]}`);
            }
        }
    } catch (e) {
        console.error('Error generating selector candidates:', e);
    }
    
    // 去重并返回
    return [...new Set(selectors.filter(s => s && s.trim()))];
}


