import { parse } from 'yaml';

// Copilot's portable agent aliases expand to runtime tools, never to permission grants.
// Exact SDK/CLI names remain usable; scoped MCP names are resolved by Copilot.
const shell = process.platform === 'win32' ? 'powershell' : 'bash';
const groups = {
  read: ['view'], search: ['grep', 'glob'], edit: ['edit', 'create', 'apply_patch'],
  execute: [shell, 'read_' + shell, 'write_' + shell, 'stop_' + shell, 'list_' + shell],
  agent: ['task', 'read_agent', 'list_agents', 'write_agent'], web: ['web_fetch', 'web_search']
};
const aliases = { notebookread: 'read', multiedit: 'edit', write: 'edit', notebookedit: 'edit', shell: 'execute', 'custom-agent': 'agent', websearch: 'web', webfetch: 'web' };
const nativeTools = new Set([...Object.values(groups).flat(), 'bash', 'powershell', 'ask_user', 'skill', 'rg', 'proteus_browser','proteus_playwright','proteus_developer','proteus_tabs','proteus_open_document','proteus_integrations','proteus_chats','proteus_folder_access']);

export function copilotAgentTools(declared) {
  if (declared === undefined || declared.includes('*')) return null;
  return [...new Set(declared.flatMap(tool => {
    const lower = tool.toLowerCase();
    if (Object.hasOwn(groups, lower)) return groups[lower];
    if (Object.hasOwn(aliases, lower)) return groups[aliases[lower]];
    if (nativeTools.has(lower)) return [lower];
    if (/^[\w.-]+\/(?:[\w.-]+|\*)$/.test(tool)) return [tool];
    throw new Error('Unsupported agent tool: ' + tool);
  }))];
}

export function agentMetadata(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  let fields = {};
  try {
    if (match) fields = parse(match[1], { strict: true, uniqueKeys: true, maxAliasCount: 50 }) ?? {};
    if (typeof fields !== 'object' || Array.isArray(fields)) throw new Error();
  } catch { return { issues: ['Invalid YAML frontmatter'], tools: null }; }
  const issues = [];
  for (const key of ['mcp-servers', 'hooks']) if (key in fields) issues.push('Adapter required for ' + key);
  let declared;
  if ('tools' in fields) {
    const raw = fields.tools;
    if (typeof raw === 'string') declared = raw.split(',').map(value => value.trim()).filter(Boolean);
    else if (Array.isArray(raw) && raw.every(value => typeof value === 'string' && value.trim())) declared = raw.map(value => value.trim());
    else issues.push('Tools must be a list of names or a comma-separated string');
  }
  let tools = null;
  if (declared) {
    // Validate every name, even when a wildcard is also present, so typos remain visible.
    for (const name of declared.filter(name => name !== '*')) {
      try { copilotAgentTools([name]); } catch (error) { issues.push(error.message); }
    }
    if (!issues.length) tools = copilotAgentTools(declared);
  }
  for (const key of ['infer', 'disable-model-invocation', 'user-invocable']) if (key in fields && typeof fields[key] !== 'boolean') issues.push(key + ' must be true or false');
  const infer = 'disable-model-invocation' in fields ? !fields['disable-model-invocation'] : fields.infer !== false;
  return { declaredTools: declared ?? null, tools, infer, userInvocable: fields['user-invocable'] !== false, issues };
}

// The runtime adds its SQL planner outside a custom agent's tool list. Apply the selected
// main agent's scope to the session too so an empty list is actually empty. MCP tools keep
// their per-agent server/tool filter; the session ceiling admits only configured MCPs.
export function selectedAgentToolScope(managed) {
  const agent = managed?.customAgents.find(candidate => candidate.name === managed.agent);
  return agent?.tools == null ? ['builtin:*', 'mcp:*', 'custom:*'] : [...new Set(agent.tools.map(tool => tool.includes('/') ? 'mcp:*' : tool))];
}
