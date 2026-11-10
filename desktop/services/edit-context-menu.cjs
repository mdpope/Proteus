// Native spelling belongs to the originating editable webContents, including
// background browser tabs. Never replace text through the selected app window.
function editContextItems(contents, params) {
  if (!params.isEditable) return [];
  const run = action => () => { if (!contents.isDestroyed()) action(); };
  const items = [];
  if (params.misspelledWord) {
    const suggestions = (params.dictionarySuggestions || []).slice(0, 8);
    items.push(...(suggestions.length ? suggestions.map(word => ({label: word.replaceAll('&', '&&'), click: run(() => contents.replaceMisspelling(word))})) : [{label: 'No spelling suggestions', enabled: false}]));
    if (contents.session?.addWordToSpellCheckerDictionary) items.push({label: 'Add to dictionary', click: run(() => contents.session.addWordToSpellCheckerDictionary(params.misspelledWord))});
    items.push({type: 'separator'});
  }
  return [...items, {role: 'undo'}, {role: 'redo'}, {type: 'separator'}, {role: 'cut'}, {role: 'copy'}, {role: 'paste'}, {role: 'selectAll'}];
}
module.exports = {editContextItems};
