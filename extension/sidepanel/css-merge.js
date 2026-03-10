/**
 * StyleSwift - CSS Merge Engine
 * 
 * CSS 去重、合并、序列化逻辑
 * 
 * 主要功能：
 * - splitTopLevelBlocks: 正确处理嵌套花括号的顶层块分割
 * - parseRules: 解析 CSS 文本为结构化数据
 * - mergeCSS: 合并两段 CSS（属性级去重）
 * - serializeRules: 将结构化数据序列化为 CSS 文本
 * 
 * 错误处理策略（§11.3 CSS 解析容错）：
 * - 畸形 CSS（未闭合花括号、非法字符）不导致崩溃
 * - 解析失败时返回空 Map 或原始 CSS（降级处理）
 * - 记录警告日志但不中断流程
 */

// ============================================================================
// 顶层块分割
// ============================================================================

/**
 * 分割 CSS 为顶层块
 * 
 * 正确处理嵌套花括号（@media, @keyframes 等）的顶层块分割。
 * 通过追踪大括号深度，确保嵌套规则被正确识别为一个整体。
 * 
 * 核心逻辑：
 * 1. 遍历 CSS 字符串，追踪 `{` 和 `}` 的深度
 * 2. 跳过 CSS 注释（/* ... * /）内的花括号，避免被误计入深度
 * 3. 跳过字符串字面量（`"..."` / `'...'`）内的花括号，避免 `content: "{"` 等属性导致深度误计
 * 4. 当遇到 `{` 时深度 +1
 * 5. 当遇到 `}` 时深度 -1
 * 6. 当深度回到 0 时，说明找到了一个完整的顶层块
 * 
 * @param {string} css - CSS 文本
 * @returns {string[]} 顶层块数组，每个元素是一个完整的 CSS 块
 * 
 * @example
 * // 普通规则
 * splitTopLevelBlocks('.header { color: red; }')
 * // → ['.header { color: red; }']
 * 
 * @example
 * // @media 嵌套规则
 * splitTopLevelBlocks('@media (max-width: 600px) { .header { color: blue; } }')
 * // → ['@media (max-width: 600px) { .header { color: blue; } }']
 * 
 * @example
 * // 混合规则
 * splitTopLevelBlocks('.a { color: red; } @media print { .a { color: black; } } .b { margin: 0; }')
 * // → ['.a { color: red; }', '@media print { .a { color: black; } }', '.b { margin: 0; }']
 */
function splitTopLevelBlocks(css) {
  try {
    const blocks = [];
    
    // 空值处理
    if (!css || typeof css !== 'string') {
      return blocks;
    }
    
    let depth = 0;
    let start = 0;
    let i = 0;

    while (i < css.length) {
      const ch = css[i];

      // 跳过 CSS 注释 /* ... */（注释内的花括号不计入深度）
      if (ch === '/' && css[i + 1] === '*') {
        const end = css.indexOf('*/', i + 2);
        i = end === -1 ? css.length : end + 2;
        continue;
      }

      // 跳过字符串字面量 "..." 或 '...'（字符串内的花括号不计入深度）
      // 常见于 content: "{" 等属性值
      if (ch === '"' || ch === "'") {
        const quote = ch;
        i++;
        while (i < css.length) {
          if (css[i] === '\\') { i += 2; continue; } // 跳过转义字符
          if (css[i] === quote) { i++; break; }
          i++;
        }
        continue;
      }

      if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          // 找到一个完整的顶层块
          const block = css.slice(start, i + 1).trim();
          if (block) {
            blocks.push(block);
          }
          start = i + 1;
        } else if (depth < 0) {
          // 深度为负说明花括号不匹配（右括号多余），记录警告并重置深度
          console.warn('[StyleSwift] CSS 花括号不匹配（右括号多余），位置：', i, '| 深度：', depth);
          depth = 0;
        }
      }

      i++;
    }

    // 如果遍历完还有未闭合的花括号，自动补全并尝试恢复
    if (depth > 0) {
      const tail = css.slice(start).trim();
      if (tail) {
        // 补足缺失的右花括号
        const repaired = tail + '}'.repeat(depth);
        console.warn(
          '[StyleSwift] CSS 存在未闭合的花括号，剩余深度：', depth,
          '| 已自动补全并尝试恢复，内容片段：', tail.slice(0, 80)
        );
        blocks.push(repaired);
      } else {
        console.warn('[StyleSwift] CSS 存在未闭合的花括号，剩余深度：', depth, '| 无残余内容，已忽略');
      }
    }

    return blocks;
  } catch (error) {
    // 分割失败，记录警告并返回空数组
    console.warn('[StyleSwift] splitTopLevelBlocks 失败，返回空数组：', error.message);
    return [];
  }
}

// ============================================================================
// CSS 规则解析
// ============================================================================

/**
 * 解析 CSS 文本为结构化数据
 * 
 * 将 CSS 文本解析为 Map<selector, Map<prop, val>> 结构。
 * - 普通规则：按选择器+属性解析，属性存储在 Map 中
 * - at-rule（@media, @keyframes 等）：整体作为一个单元，使用 __raw__ 标记保留原始文本
 * 
 * 错误处理策略：
 * - 解析失败时返回空 Map
 * - 单个块解析失败时跳过该块继续处理其他块
 * - 记录警告日志但不中断流程
 * 
 * @param {string} css - CSS 文本
 * @returns {Map<string, Map<string, string>>} 解析后的规则映射
 * 
 * @example
 * // 普通规则
 * parseRules('.header { color: red; font-size: 14px; }')
 * // → Map { '.header' => Map { 'color' => 'red', 'font-size' => '14px' } }
 * 
 * @example
 * // @media 规则
 * parseRules('@media (max-width: 600px) { .header { color: blue; } }')
 * // → Map { '@media (max-width: 600px)' => Map { '__raw__ => '@media (max-width: 600px) { .header { color: blue; } }' } }
 */
function parseRules(css) {
  try {
    const rules = new Map();
    
    // 空值或非字符串处理
    if (!css || typeof css !== 'string' || !css.trim()) {
      return rules;
    }

    const blocks = splitTopLevelBlocks(css);

    for (const block of blocks) {
      try {
        if (block.startsWith('@')) {
          // at-rule（@media, @keyframes 等）：整体作为一个单元，按 header 去重
          const headerEnd = block.indexOf('{');
          if (headerEnd === -1) {
            console.warn('[StyleSwift] CSS 解析警告：at-rule 缺少左花括号，跳过该块');
            continue;
          }
          const header = block.slice(0, headerEnd).trim();
          if (header) {
            rules.set(header, new Map([['__raw__', block]]));
          }
        } else {
          // 普通规则：按选择器+属性去重
          const braceIdx = block.indexOf('{');
          if (braceIdx === -1) {
            console.warn('[StyleSwift] CSS 解析警告：普通规则缺少左花括号，跳过该块');
            continue;
          }
          const selector = block.slice(0, braceIdx).trim();
          if (!selector) {
            console.warn('[StyleSwift] CSS 解析警告：选择器为空，跳过该块');
            continue;
          }
          
          const lastBraceIdx = block.lastIndexOf('}');
          const body = braceIdx < lastBraceIdx 
            ? block.slice(braceIdx + 1, lastBraceIdx) 
            : block.slice(braceIdx + 1);
            
          const props = new Map();
          for (const decl of body.split(';')) {
            const colonIdx = decl.indexOf(':');
            if (colonIdx === -1) continue;
            const prop = decl.slice(0, colonIdx).trim();
            const val = decl.slice(colonIdx + 1).trim();
            if (prop && val) {
              props.set(prop, val);
            }
          }
          
          if (props.size > 0) {
            rules.set(selector, props);
          }
        }
      } catch (blockError) {
        // 单个块解析失败，记录警告但继续处理其他块
        const preview = block.length > 50 ? block.slice(0, 50) + '...' : block;
        console.warn('[StyleSwift] CSS 块解析失败，跳过该块：', blockError.message, '| 内容：', preview);
      }
    }

    return rules;
  } catch (error) {
    // 整体解析失败，记录警告并返回空 Map
    console.warn('[StyleSwift] parseRules 解析失败，返回空 Map：', error.message);
    return new Map();
  }
}

// ============================================================================
// CSS 规则序列化
// ============================================================================

/**
 * 将结构化规则序列化为 CSS 文本
 * 
 * 将 Map<selector, Map<prop, val>> 序列化为格式化的 CSS 文本。
 * - at-rule：直接输出原始文本
 * - 普通规则：输出缩进格式
 * 
 * @param {Map<string, Map<string, string>>} rules - 解析后的规则映射
 * @returns {string} 格式化的 CSS 文本
 * 
 * @example
 * const rules = new Map([
 *   ['.header', new Map([['color', 'red'], ['font-size', '14px']])]
 * ]);
 * serializeRules(rules);
 * // → '.header {\n  color: red;\n  font-size: 14px;\n}'
 */
function serializeRules(rules) {
  try {
    const lines = [];
    for (const [selector, props] of rules) {
      if (props.has('__raw__')) {
        // at-rule：直接输出原始文本
        lines.push(props.get('__raw__'));
      } else {
        // 普通规则：输出缩进格式
        const decls = Array.from(props).map(([p, v]) => `  ${p}: ${v};`).join('\n');
        lines.push(`${selector} {\n${decls}\n}`);
      }
    }
    return lines.join('\n\n');
  } catch (error) {
    // 序列化失败，记录警告并返回空字符串
    console.warn('[StyleSwift] serializeRules 失败，返回空字符串：', error.message);
    return '';
  }
}

// ============================================================================
// CSS 合并
// ============================================================================

/**
 * 合并两段 CSS
 * 
 * 合并策略：
 * - 同选择器同属性：新值覆盖旧值
 * - 同选择器不同属性：追加到现有属性中
 * - 不同选择器：直接合并
 * - at-rule（@media, @keyframes 等）：整体替换
 * 
 * 错误处理策略：
 * - 合并失败时返回已有的 CSS（降级处理）
 * - 记录警告日志但不中断流程
 * 
 * @param {string} existingCSS - 已有的 CSS 文本
 * @param {string} newCSS - 新增的 CSS 文本
 * @returns {string} 合并后的 CSS 文本
 * 
 * @example
 * // 同属性覆盖
 * mergeCSS('.header { color: red; }', '.header { color: blue; }')
 * // → '.header {\n  color: blue;\n}'
 * 
 * @example
 * // 不同属性追加
 * mergeCSS('.header { color: red; }', '.header { font-size: 14px; }')
 * // → '.header {\n  color: red;\n  font-size: 14px;\n}'
 * 
 * @example
 * // 不同选择器合并
 * mergeCSS('.header { color: red; }', '.footer { color: blue; }')
 * // → '.header {\n  color: red;\n}\n\n.footer {\n  color: blue;\n}'
 * 
 * @example
 * // @media 整体替换
 * mergeCSS('@media print { .a { color: black; } }', '@media print { .a { color: gray; } }')
 * // → '@media print { .a { color: gray; } }'
 */
function mergeCSS(existingCSS, newCSS) {
  try {
    const existingRules = parseRules(existingCSS);
    const newRules = parseRules(newCSS);

    for (const [selector, props] of newRules) {
      if (props.has('__raw__')) {
        // at-rule 整体覆盖（@media, @keyframes 等）
        existingRules.set(selector, props);
      } else if (!existingRules.has(selector)) {
        // 新选择器：直接添加
        existingRules.set(selector, props);
      } else {
        // 已存在选择器：合并属性
        const existing = existingRules.get(selector);
        if (existing.has('__raw__')) {
          // 如果现有的是 at-rule，整体替换为普通规则
          existingRules.set(selector, props);
        } else {
          // 属性级合并：新值覆盖旧值
          for (const [prop, val] of props) {
            existing.set(prop, val);
          }
        }
      }
    }

    return serializeRules(existingRules);
  } catch (error) {
    // 合并失败，降级处理：返回已有的 CSS
    console.warn('[StyleSwift] mergeCSS 合并失败，返回已有 CSS：', error.message);
    // 如果已有 CSS 也是无效的，返回空字符串
    return existingCSS || '';
  }
}

// ============================================================================
// 导出
// ============================================================================

export { splitTopLevelBlocks, parseRules, serializeRules, mergeCSS };
