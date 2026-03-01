/**
 * StyleSwift 时间工具函数模块
 * 
 * 提供统一的时间处理功能，避免在多个文件中重复定义
 * 使用方法：在需要时间功能的JS文件中引入此模块
 */

/**
 * 获取北京时间
 * @returns {Date} 北京时间日期对象
 */
function getBeijingTime() {
    const now = new Date();
    // 获取北京时间（UTC+8）
    const beijingTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    return beijingTime;
}

/**
 * 格式化北京时间为字符串
 * @param {Date|null} date - 要格式化的日期，null时使用当前北京时间
 * @returns {string} 格式化后的时间字符串 (YYYY-MM-DD HH:mm:ss.SSS CST)
 */
function formatBeijingTime(date = null) {
    if (!date) date = getBeijingTime();
    return date.toISOString().replace('T', ' ').substring(0, 23) + ' CST';
}

/**
 * 计算两个时间点之间的耗时
 * @param {Date} startTime - 开始时间
 * @param {Date|null} endTime - 结束时间，null时使用当前时间
 * @returns {number} 耗时（秒）
 */
function calculateDuration(startTime, endTime = null) {
    if (!endTime) endTime = new Date();
    return (endTime - startTime) / 1000; // 返回秒
}

/**
 * 创建性能计时器
 * @param {string} name - 计时器名称，用于日志标识
 * @returns {Object} 计时器对象，包含 start, end, getDuration 方法
 */
function createTimer(name = 'Timer') {
    let startTime = null;
    let endTime = null;
    
    return {
        start() {
            startTime = getBeijingTime();
            console.log(`=== ${name} 开始 ===`);
            console.log('开始时间:', formatBeijingTime(startTime));
            return startTime;
        },
        
        end() {
            endTime = getBeijingTime();
            const duration = calculateDuration(startTime, endTime);
            console.log(`=== ${name} 完成 ===`);
            console.log('结束时间:', formatBeijingTime(endTime));
            console.log('总耗时:', duration.toFixed(3), '秒');
            return { endTime, duration };
        },
        
        getDuration() {
            if (!startTime) return 0;
            const currentEnd = endTime || getBeijingTime();
            return calculateDuration(startTime, currentEnd);
        },
        
        getStartTime() {
            return startTime;
        },
        
        getEndTime() {
            return endTime;
        }
    };
}

/**
 * 格式化耗时为易读字符串
 * @param {number} seconds - 耗时（秒）
 * @returns {string} 格式化的耗时字符串
 */
function formatDuration(seconds) {
    if (seconds < 1) {
        return `${(seconds * 1000).toFixed(0)}ms`;
    } else if (seconds < 60) {
        return `${seconds.toFixed(3)}s`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}m ${remainingSeconds.toFixed(1)}s`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
}

/**
 * 记录函数执行时间的装饰器函数
 * @param {Function} func - 要装饰的函数
 * @param {string} funcName - 函数名称，用于日志
 * @returns {Function} 装饰后的函数
 */
function timeFunction(func, funcName = 'Function') {
    return async function(...args) {
        const timer = createTimer(funcName);
        timer.start();
        
        try {
            const result = await func.apply(this, args);
            timer.end();
            return result;
        } catch (error) {
            const duration = timer.getDuration();
            console.error(`=== ${funcName} 失败 ===`);
            console.error('失败时间:', formatBeijingTime());
            console.error('执行耗时:', formatDuration(duration));
            console.error('错误详情:', error);
            throw error;
        }
    };
}

/**
 * 日志时间戳生成器
 * @returns {string} 格式化的时间戳，用于日志前缀
 */
function getLogTimestamp() {
    return `[${formatBeijingTime()}]`;
}

/**
 * 带时间戳的控制台日志函数
 * @param {string} level - 日志级别 ('log', 'info', 'warn', 'error')
 * @param {...any} args - 日志参数
 */
function logWithTimestamp(level = 'log', ...args) {
    const timestamp = getLogTimestamp();
    console[level](timestamp, ...args);
}

// 快捷日志函数
const timeLog = {
    log: (...args) => logWithTimestamp('log', ...args),
    info: (...args) => logWithTimestamp('info', ...args),
    warn: (...args) => logWithTimestamp('warn', ...args),
    error: (...args) => logWithTimestamp('error', ...args)
};

// 导出所有函数（ES6 模块语法）
// 注意：Chrome扩展中可能需要使用其他导出方式
if (typeof module !== 'undefined' && module.exports) {
    // Node.js 环境
    module.exports = {
        getBeijingTime,
        formatBeijingTime,
        calculateDuration,
        createTimer,
        formatDuration,
        timeFunction,
        getLogTimestamp,
        logWithTimestamp,
        timeLog
    };
} else {
    // 浏览器环境 - 将函数添加到全局对象
    window.StyleSwiftTimeUtils = {
        getBeijingTime,
        formatBeijingTime,
        calculateDuration,
        createTimer,
        formatDuration,
        timeFunction,
        getLogTimestamp,
        logWithTimestamp,
        timeLog
    };
}

/**
 * 使用示例：
 * 
 * // 基本时间功能
 * const now = getBeijingTime();
 * const timeStr = formatBeijingTime(now);
 * 
 * // 计时器使用
 * const timer = createTimer('样式生成');
 * timer.start();
 * // ... 执行一些操作
 * timer.end();
 * 
 * // 函数装饰器
 * const timedFunction = timeFunction(myFunction, 'myFunction');
 * await timedFunction();
 * 
 * // 带时间戳的日志
 * timeLog.info('这是一条带时间戳的日志');
 */ 