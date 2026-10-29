const taskId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value) ? value : null;
const text = content => typeof content === 'string' ? content : Array.isArray(content) ? content.filter(block => block.type === 'text').map(block => block.text).join('\n') : '';

// Claude can emit a successful result for a startup/orphan notification before it
// reads our user input. Correlate the replayed input UUID, not just any result.
// Native background jobs also outlive an individual result; they belong to this
// owned process until terminal task notifications and a subsequent result arrive.
export class ClaudeTurnLifecycle {
  constructor(inputId, tools, update) {
    this.inputId = inputId; this.inputs = new Set([inputId]); this.acknowledged = false;
    this.tools = tools; this.update = update; this.tasks = new Map(); this.terminal = new Set();
  }
  sent(id) { this.inputs.add(id); }
  get pending() { return this.tasks.size; }
  start(id, toolId) {
    if (!taskId(id) || this.terminal.has(id)) return;
    const tool = this.tools.get(toolId) || this.tasks.get(id);
    this.tasks.set(id, tool);
    if (tool) { tool.backgroundTaskId = id; tool.status = 'running'; delete tool.finishedAt; }
    this.update();
  }
  finish(id, status) {
    if (!taskId(id)) return;
    this.terminal.add(id);
    const tool = this.tasks.get(id); this.tasks.delete(id);
    if (tool) {
      tool.status = status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'interrupted';
      tool.finishedAt = new Date().toISOString(); tool.durationMs = Date.now() - Date.parse(tool.startedAt);
    }
    this.update();
  }
  observe(message) {
    if (message.parent_tool_use_id) return;
    if (message.type === 'user' && message.uuid === this.inputId) this.acknowledged = true;
    if (message.type === 'system') {
      if (message.subtype === 'task_started') this.start(message.task_id, message.tool_use_id);
      if (message.subtype === 'task_progress') {
        this.start(message.task_id, message.tool_use_id);
        const tool = this.tasks.get(message.task_id);
        if (tool) { tool.durationMs = Date.now() - Date.parse(tool.startedAt); this.update(); }
      }
      if (message.subtype === 'task_notification' && ['completed','failed','stopped'].includes(message.status)) this.finish(message.task_id, message.status);
    }
    if (message.type !== 'user' || this.inputs.has(message.uuid)) return;
    // Older runtimes expose task handles in these native tool-result envelopes.
    // Match only known Bash/Monitor calls and their exact anchored handle syntax.
    for (const block of Array.isArray(message.message?.content) ? message.message.content : []) {
      if (block.type !== 'tool_result' || block.is_error) continue;
      const tool = this.tools.get(block.tool_use_id), output = text(block.content);
      const id = tool?.name === 'Bash' ? /^Command running in background with ID: ([A-Za-z0-9_-]{1,128})\./.exec(output)?.[1]
        : tool?.name === 'Monitor' ? /^Monitor started \(task ([A-Za-z0-9_-]{1,128}),/.exec(output)?.[1] : null;
      if (id) this.start(id, block.tool_use_id);
    }
    // The same older runtimes deliver task completion as a generated user frame.
    // Explicit inputs cannot masquerade as these frames; ignore unknown task IDs.
    const notification = message.message?.content;
    if (typeof notification !== 'string' || !notification.startsWith('<task-notification>')) return;
    const status = /<status>(completed|failed|stopped)<\/status>/.exec(notification)?.[1];
    if (status) for (const match of notification.matchAll(/<task-id>([A-Za-z0-9_-]{1,128})<\/task-id>/g)) if (this.tasks.has(match[1])) this.finish(match[1], status);
  }
}
