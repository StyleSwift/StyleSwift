/**
 * StyleSwift - Think Tool
 *
 * A dedicated thinking space for structured reasoning during complex CSS tasks.
 * Based on Anthropic's "think tool" research - improves strategy compliance and
 * sequential decision-making in agent workflows.
 *
 * Reference: claude-think-tool.md (τ-Bench showed 54% improvement in airline domain)
 */

// =============================================================================
// Think Tool Definition
// =============================================================================

export const THINK_TOOL = {
  name: "think",
  description: `使用此工具进行结构化推理。它不会获取新信息或执行任何操作，只是将思考过程记录到对话日志中。

使用时机：
1. 在执行 apply_styles/edit_css 之前，验证约束合规性
2. 在收到工具结果后，规划下一步行动
3. 在策略密集场景中，验证是否遵循所有规则
4. 在顺序决策中，每一步都建立在前一步之上且错误代价高昂时

思考内容建议包含：
- 适用规则清单（从系统提示中提取）
- 已收集信息检查（是否缺少关键数据）
- 计划行动合规性验证
- 工具结果正确性迭代检查`,
  input_schema: {
    type: "object",
    properties: {
      thought: {
        type: "string",
        description:
          "结构化推理内容。应包含：规则清单、信息检查、合规验证或步骤规划。",
      },
    },
    required: ["thought"],
  },
};

// =============================================================================
// Think Tool Handler
// =============================================================================

/**
 * Create think tool handler
 * Think tool doesn't perform any action - it just returns confirmation
 * that the thought was recorded. The actual thought content becomes part
 * of the conversation history via tool_result.
 *
 * @returns {Function} Handler for think tool
 */
export function createThinkToolHandlers() {
  return {
    think: async (args) => {
      // Thought is recorded in conversation history via tool_result mechanism
      // No actual action performed - this is a "scratchpad" tool
      const thoughtPreview = args.thought?.slice(0, 100) || "";
      const fullLength = args.thought?.length || 0;
      const truncatedPreview =
        fullLength > 100 ? `${thoughtPreview}... (${fullLength} chars)` : thoughtPreview;

      // Log for debugging
      console.log("[Think Tool] Recorded thought:", truncatedPreview);

      // Return simple confirmation - the thought content is preserved in history
      return `(思考已记录)`;
    },
  };
}