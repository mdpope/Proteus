// Node test after hooks run in registration order. Release resources before
// deleting their directories, including on Windows where open SQLite files lock.
export function cleanupStack(t) {
  const actions = [];
  t.after(async () => {
    const errors = [];
    for (const action of actions.reverse()) {
      try { await action(); } catch (error) { errors.push(error); }
    }
    if (errors.length) throw new AggregateError(errors, 'Fixture cleanup failed');
  });
  return action => actions.push(action);
}
