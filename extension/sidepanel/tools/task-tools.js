/**
 * StyleSwift - Task Tools
 *
 * Tools for task management and sub-agent invocation.
 */

// =============================================================================
// TodoWrite - Task list management
// =============================================================================

export const TODO_WRITE_TOOL = {
  name: "TodoWrite",
  description: `Update the task list. Used for planning and tracking progress of complex tasks.

Use cases:
- Multi-step tasks requested by the user
- Breaking down a large task into sub-tasks
- Tracking task completion progress

Working modes:
1. Planning mode (first call): Pass a complete task array with all tasks set to status: pending.
   The plan is presented to the user for confirmation. User can edit, add, or remove steps.
   Execution begins only after confirmation.
   Example: todos: [{content: "Get page structure", status: "pending"}, {content: "Modify navigation styles", status: "pending"}]

2. Update mode (subsequent calls): Pass task id and new status to update individual task progress (no confirmation needed).
   Example: todos: [{id: "todo_1", status: "in_progress"}] or [{id: "todo_1", status: "completed"}]

Status flow: pending → in_progress → completed
- Mark as in_progress when starting a task
- Mark as completed when finished

Simple tasks (single-step operations) do not need this tool.`,
  input_schema: {
    type: "object",
    properties: {
      todos: {
        type: "array",
        description:
          "Task array. Planning mode: each item contains content and status. Update mode: each item contains id and fields to update.",
        items: {
          type: "object",
          properties: {
            id: {
              type: "string",
              description: "Task ID (required in update mode, returned by first call)",
            },
            content: {
              type: "string",
              description: "Task description (required in planning mode)",
            },
            status: {
              type: "string",
              enum: ["pending", "in_progress", "completed"],
              description: "Task status",
            },
          },
        },
      },
    },
    required: ["todos"],
  },
};

// =============================================================================
// Task Tool - Sub-agent invocation
// =============================================================================

export const TASK_TOOL = {
  name: "Task",
  description: `Invoke a sub-agent to handle complex tasks.
Sub-agents run in isolated context and do not pollute the main conversation history.

Available sub-agents:
- QualityAudit: Style quality inspector. Validates visual effects, accessibility, and consistency of applied CSS.

Use cases:
- Quality inspection after applying 8+ CSS rules
- Verifying effects after global color/theme changes
- Systematic investigation when user reports visual issues`,
  input_schema: {
    type: "object",
    properties: {
      description: { type: "string", description: "Brief task description (3-5 words)" },
      prompt: { type: "string", description: "Detailed task instructions" },
      agent_type: {
        type: "string",
        enum: ["QualityAudit"],
        description: "Sub-agent type",
      },
    },
    required: ["description", "prompt", "agent_type"],
  },
};

/**
 * Task tools handler factory
 * @returns {object} Handlers for task tools
 */
export function createTaskToolHandlers() {
  return {
    TodoWrite: async (args) => {
      const { updateTodos } = await import("../agent/todo-manager.js");
      return updateTodos(args.todos);
    },

    Task: async (args, context) => {
      const { runTask } = await import("../agent/agent-loop.js").catch(() => ({
        runTask: null,
      }));
      if (runTask) {
        return await runTask(
          args.description,
          args.prompt,
          args.agent_type,
          context?.abortSignal,
          context?.tabId,
          context?.uiCallbacks,
        );
      }
      return "(Sub-agent functionality not yet implemented)";
    },
  };
}