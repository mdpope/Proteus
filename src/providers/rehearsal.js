export class RehearsalProvider {
  async run({ run, prompt, emit, ask, signal }) {
    emit('assistant', 'Local rehearsal — no AI provider was called.\n\nThe schedule loaded successfully. Workspace: ' + run.schedule.workspace.cwd);
    if (signal.aborted) throw new Error('Cancelled');
    const answer = await ask({ type: 'question', question: 'This sample run needs feedback. What should the next checkpoint focus on?' });
    if (signal.aborted) throw new Error('Cancelled');
    emit('assistant', `Checkpoint saved: ${answer}.\n\nYour reply, the schedule snapshot, and this run history survive an app restart. This is a rehearsal of the feedback flow, not model-generated work.`);
  }
  async status() { return { available: true, label: 'Local rehearsal', usage: null }; }
  async close() {}
}
