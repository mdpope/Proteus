// A host safeguard, not a provider allowance. Keep turn budgets and the stalled
// progress watchdog aligned; transport/sign-in timeouts have separate purposes.
export const executionSafeguardMs = 2 * 60 * 60 * 1000;
export const activeExecutionLimit = provider => Object.assign(
  new Error(`${provider} exceeded the active execution time limit. Waiting for input was excluded. Continue this chat to resume the same session.`),
  { code: 'PROVIDER_ACTIVE_TIME_LIMIT' }
);
export const isActiveExecutionLimit = error => ['PROVIDER_ACTIVE_TIME_LIMIT', 'COPILOT_ACTIVE_TIME_LIMIT', 'CLAUDE_ACTIVE_TIME_LIMIT'].includes(error?.code);
