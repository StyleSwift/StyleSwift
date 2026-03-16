/**
 * StyleSwift - Lightweight JSON Schema Validator
 *
 * 针对 StyleSwift 工具参数校验场景实现的轻量级 JSON Schema 验证器。
 * 覆盖项目实际用到的 JSON Schema 特性：
 *   - type (string / number / integer / boolean / array / object)
 *   - required（必填字段列表）
 *   - properties（属性递归校验）
 *   - enum（枚举值校验）
 *   - items（数组元素递归校验）
 *
 * 错误信息以中文输出，便于模型理解并自行修正参数。
 */

// =============================================================================
// 内部辅助函数
// =============================================================================

/**
 * 返回值对应的 JSON Schema type 字符串。
 * 注意：integer 是 number 的子集，JS 无法区分，统一用 "integer" 标记整数。
 *
 * @param {*} value
 * @returns {"string"|"number"|"integer"|"boolean"|"array"|"object"|"null"|"undefined"}
 */
function _getType(value) {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (Array.isArray(value)) return "array";
  if (typeof value === "number") {
    return Number.isInteger(value) ? "integer" : "number";
  }
  return typeof value; // "string" | "boolean" | "object"
}

/**
 * 判断实际类型是否满足 schema type 要求。
 * JSON Schema 规定 integer 是 number 的子集，因此 "integer" 类型同时接受整数和 number。
 *
 * @param {string} schemaType - schema 中声明的 type
 * @param {string} actualType - _getType() 返回的实际类型
 * @returns {boolean}
 */
function _typeMatches(schemaType, actualType) {
  if (schemaType === actualType) return true;
  // schema 要求 number，实际为 integer：合法（integer ⊆ number）
  if (schemaType === "number" && actualType === "integer") return true;
  return false;
}

// =============================================================================
// 核心递归校验函数
// =============================================================================

/**
 * 递归校验 value 是否符合 schema，返回错误消息列表。
 * 无错误时返回空数组。
 *
 * @param {object} schema - JSON Schema 对象
 * @param {*} value - 被校验的值
 * @param {string} [path="(root)"] - 当前字段路径（用于错误信息定位）
 * @returns {string[]} 错误消息列表
 */
function _validate(schema, value, path = "(root)") {
  if (!schema || typeof schema !== "object") return [];

  const errors = [];
  const actualType = _getType(value);

  // ── type 校验 ──────────────────────────────────────────────────────────────
  if (schema.type !== undefined) {
    if (!_typeMatches(schema.type, actualType)) {
      errors.push(
        `参数 "${path}" 类型错误：期望 ${schema.type}，实际为 ${actualType === "undefined" ? "未提供（undefined）" : actualType + `（值：${JSON.stringify(value)}）`}`,
      );
      // 类型不匹配时停止进一步校验此字段，避免产生噪音错误
      return errors;
    }
  }

  // ── enum 校验 ──────────────────────────────────────────────────────────────
  if (Array.isArray(schema.enum)) {
    if (!schema.enum.includes(value)) {
      const allowed = schema.enum.map((v) => JSON.stringify(v)).join(", ");
      errors.push(
        `参数 "${path}" 枚举值不合法：必须是 [${allowed}] 之一，实际为 ${JSON.stringify(value)}`,
      );
    }
  }

  // ── object 校验：required + properties ────────────────────────────────────
  if (schema.type === "object" || schema.properties || schema.required) {
    // required 字段检查
    if (Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (value == null || value[field] === undefined || value[field] === null) {
          const label = path === "(root)" ? `"${field}"` : `"${path}.${field}"`;
          errors.push(`缺少必填参数 ${label}`);
        }
      }
    }

    // properties 递归校验（仅校验已存在的字段，不强制要求未声明字段）
    if (schema.properties && value != null && typeof value === "object") {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (value[key] !== undefined) {
          const childPath = path === "(root)" ? key : `${path}.${key}`;
          const childErrors = _validate(propSchema, value[key], childPath);
          errors.push(...childErrors);
        }
      }
    }
  }

  // ── array 校验：items ──────────────────────────────────────────────────────
  if (schema.type === "array" && Array.isArray(value) && schema.items) {
    for (let i = 0; i < value.length; i++) {
      const itemErrors = _validate(schema.items, value[i], `${path}[${i}]`);
      errors.push(...itemErrors);
    }
  }

  return errors;
}

// =============================================================================
// 公共 API
// =============================================================================

/**
 * 校验工具调用参数是否符合 input_schema。
 *
 * @param {object} inputSchema - 工具的 input_schema（JSON Schema 对象）
 * @param {object} args - LLM 传入的工具参数
 * @returns {{ valid: boolean, errors: string[] }}
 *
 * @example
 * const { valid, errors } = validateToolArgs(grepTool.input_schema, { scope: "bad" });
 * // valid: false
 * // errors: ['缺少必填参数 "query"', '参数 "scope" 枚举值不合法：...']
 */
function validateToolArgs(inputSchema, args) {
  if (!inputSchema) return { valid: true, errors: [] };

  const errors = _validate(inputSchema, args);
  return { valid: errors.length === 0, errors };
}

export { validateToolArgs };
