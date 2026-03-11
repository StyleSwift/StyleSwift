/**
 * StyleSwift - Todo Manager
 * 任务管理模块，用于 Agent 规划和追踪复杂任务
 */

// =============================================================================
// 任务状态管理
// =============================================================================

/**
 * 任务状态枚举
 * @enum {string}
 */
const TodoStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed'
};

/**
 * 当前任务列表
 * 每个 agentLoop 周期开始时重置
 * @type {Array<{id: string, content: string, status: TodoStatus}>}
 */
let currentTodos = [];

/**
 * 任务 ID 计数器
 * @type {number}
 */
let todoIdCounter = 0;

/**
 * UI 更新回调函数
 * @type {Function|null}
 */
let onTodoUpdate = null;

// =============================================================================
// 核心函数
// =============================================================================

/**
 * 生成唯一任务 ID
 * @returns {string}
 */
function generateTodoId() {
  return `todo_${++todoIdCounter}`;
}

/**
 * 重置任务列表
 * 每次 agentLoop 开始时调用
 */
function resetTodos() {
  currentTodos = [];
  todoIdCounter = 0;
}

/**
 * 设置 UI 更新回调
 * @param {Function|null} callback - 回调函数 (todos: Array) => void
 */
function setTodoUpdateCallback(callback) {
  onTodoUpdate = callback;
}

/**
 * 触发 UI 更新
 */
function notifyUpdate() {
  if (onTodoUpdate) {
    onTodoUpdate([...currentTodos]);
  }
}

/**
 * 更新任务列表
 *
 * 这是 Agent 调用的核心函数。支持两种模式：
 *
 * 1. 完全替换模式（传入完整数组）：
 *    - todos: [{content: '...', status: 'pending'}, ...]
 *    - 所有任务都会被替换
 *
 * 2. 增量更新模式（传入部分字段）：
 *    - todos: [{id: 'todo_1', status: 'completed'}, ...]
 *    - 只更新指定任务的指定字段
 *
 * @param {Array<{content?: string, status?: TodoStatus, id?: string}>} todos - 任务数组
 * @returns {string} 操作结果描述
 */
function updateTodos(todos) {
  if (!Array.isArray(todos) || todos.length === 0) {
    return '任务列表为空，未做任何更新。';
  }

  // 检查是否为增量更新模式（第一个元素有 id）
  const isIncremental = todos[0].id !== undefined;

  if (isIncremental) {
    // 增量更新模式
    for (const update of todos) {
      if (!update.id) continue;

      const todo = currentTodos.find(t => t.id === update.id);
      if (todo) {
        if (update.content !== undefined) {
          todo.content = update.content;
        }
        if (update.status !== undefined) {
          todo.status = update.status;
        }
      }
    }
  } else {
    // 完全替换模式
    currentTodos = todos.map(t => ({
      id: generateTodoId(),
      content: t.content || '(未命名任务)',
      status: t.status || TodoStatus.PENDING
    }));
  }

  // 触发 UI 更新
  notifyUpdate();

  // 返回格式化的任务列表
  return formatTodoList();
}

/**
 * 获取当前任务列表
 * @returns {Array} 任务数组的副本
 */
function getTodos() {
  return [...currentTodos];
}

/**
 * 将任务标记为进行中
 * @param {string} todoId - 任务 ID
 */
function startTodo(todoId) {
  const todo = currentTodos.find(t => t.id === todoId);
  if (todo) {
    todo.status = TodoStatus.IN_PROGRESS;
    notifyUpdate();
  }
}

/**
 * 将任务标记为已完成
 * @param {string} todoId - 任务 ID
 */
function completeTodo(todoId) {
  const todo = currentTodos.find(t => t.id === todoId);
  if (todo) {
    todo.status = TodoStatus.COMPLETED;
    notifyUpdate();
  }
}

/**
 * 格式化任务列表为可读文本
 * @returns {string}
 */
function formatTodoList() {
  if (currentTodos.length === 0) {
    return '(当前无任务)';
  }

  const statusIcon = {
    [TodoStatus.PENDING]: '⏳',
    [TodoStatus.IN_PROGRESS]: '🔄',
    [TodoStatus.COMPLETED]: '✅'
  };

  const lines = currentTodos.map(t => {
    const icon = statusIcon[t.status] || '⏳';
    return `${icon} [${t.id}] ${t.content}`;
  });

  // 统计进度
  const completed = currentTodos.filter(t => t.status === TodoStatus.COMPLETED).length;
  const total = currentTodos.length;

  return `任务进度 (${completed}/${total}):\n${lines.join('\n')}`;
}

// =============================================================================
// 导出
// =============================================================================

export {
  TodoStatus,
  resetTodos,
  setTodoUpdateCallback,
  updateTodos,
  getTodos,
  startTodo,
  completeTodo,
  formatTodoList
};
