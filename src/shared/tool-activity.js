import { safeToolError } from '../../public/features/chats/tool-presentation.js';
const maxText = 24000;
const secretKey = /^(?:password|passwd|secret|token|access[_-]?token|refresh[_-]?token|api[_-]?key|authorization|cookie|set-cookie|credential|credentials)$/i;
export function displayText(value, limit = maxText) {
  let text = typeof value === 'string' ? value : JSON.stringify(value ?? '', (key, item) => secretKey.test(key) ? '[redacted]' : item, 2);
  text = text.replace(/\b(Bearer\s+)[\w.+/=-]+/gi, '$1[redacted]')
    .replace(/((?:"?(?:password|access_token|refresh_token|api_key|authorization|cookie)"?)\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,}]+)/gi, '$1[redacted]');
  return text.length > limit ? text.slice(0, limit) + '\n… Display shortened. Full output is in the provider session files.' : text;
}
function resultText(value) {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (typeof parsed?.snapshot === 'string') return [parsed.title, parsed.url, '', parsed.snapshot].filter(v => v !== undefined).join('\n');
    return parsed;
  } catch { return value; }
}
export function toolSummary(name, args = {}, title) {
  const short = value => displayText(value, 160).split('\n')[0];
  if (name === 'proteus_browser') return `Browser · ${args.action || 'operation'}${args.url ? ' · ' + short(args.url) : args.name ? ' · ' + short(args.name) : ''}`;
  if (['bash', 'shell', 'powershell'].includes(name)) return `Run · ${short(args.description || args.command || args.cmd || title || name)}`;
  if (['view', 'read_file'].includes(name)) return `Read · ${short(args.path || args.file_path || args.filePath || title || name)}`;
  if (['edit', 'create', 'write_file', 'apply_patch'].includes(name)) return `Edit · ${short(args.path || args.file_path || args.fileName || title || name)}`;
  if (['grep', 'glob'].includes(name)) return `Search · ${short(args.pattern || args.query || title || name)}`;
  return short(title || name || 'Tool operation');
}

export function toolActivity({ run, emit, update }) {
  const calls = new Map();
  const receive = event => {
    if (!event.type.startsWith('tool.execution_')) return false;
    const d = event.data || {}; if (!d.toolCallId) return false;
    const key = `${event.agentId || ''}:${d.toolCallId}`;
    let item = calls.get(key);
    if (!item) {
      item = { callId: d.toolCallId, ...(event.agentId ? { agentId: event.agentId } : {}), name: d.toolName || 'Tool', summary: toolSummary(d.toolName, d.arguments, d.toolTitle), status: 'running', startedAt: event.timestamp || new Date().toISOString() };
      calls.set(key, item);
      emit('tool', item.summary, { tool: item });
    }
    if (event.type === 'tool.execution_start') {
      item.name = d.toolName; item.summary = toolSummary(d.toolName, d.arguments, d.toolTitle);
      item.arguments = displayText(d.arguments || {}, 6000);
    } else if (event.type === 'tool.execution_progress') item.progress = displayText(d.progressMessage, 2000);
    else if (event.type === 'tool.execution_partial_result') item.output = displayText((item.output || '') + d.partialOutput);
    else if (event.type === 'tool.execution_complete') {
      const parse=value=>{try{return typeof value==='string'?JSON.parse(value):value;}catch{return null;}};
      const content=parse(d.result?.content),structured=d.result?.structuredContent;
      const error=safeToolError(d.error)||safeToolError(content?.error)||safeToolError(structured?.error)||(d.success===false||d.result?.isError===true?safeToolError(d.result?.detailedContent||d.result?.content||structured||d.result):null);
      item.status = d.success === false || d.result?.isError === true || error ? 'failed' : 'completed';
      item.finishedAt = event.timestamp || new Date().toISOString();
      item.durationMs = Math.max(0, Date.parse(item.finishedAt) - Date.parse(item.startedAt));
      const output = resultText(d.result?.detailedContent || d.result?.content || d.result?.structuredContent || item.output || '');
      item.output = displayText(output);
      const exitCode = ['bash', 'shell', 'powershell'].includes(item.name) && typeof output === 'string' && output.match(/<shellId: [^<>\r\n]+ completed with exit code ([1-9]\d*)>\s*$/)?.[1];
      if (exitCode) { item.status = 'failed'; item.error = `Command exited with code ${exitCode}.`; }
      if (error) item.error = error;
      if (d.result?.contents?.some(c => c.type !== 'text') || d.result?.binaryResultsForLlm?.length) item.attachments = 'This tool also returned media or a resource. See the provider session for the original payload.';
    }
    update(); return true;
  };
  receive.finish = () => {
    for (const item of calls.values()) if (item.status === 'running') {
      item.status = 'interrupted'; item.progress = 'Turn ended before a tool result was reported.';
    }
    update();
  };
  return receive;
}
