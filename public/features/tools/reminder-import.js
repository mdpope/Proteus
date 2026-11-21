const format = 'proteus-reminders-1';
const count = (value, label) => value+' '+label+(value===1?'':'s');

export function mountReminderImport(host, {write, refresh, isCurrent}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'reminder-import';
  dialog.setAttribute('aria-label','Import reminders');
  dialog.innerHTML = `<h2>Import reminders</h2>
    <details><summary>Export from Apple Reminders on a Mac</summary>
      <p>Open Reminders on the Mac that has the accounts you need and let it finish syncing. The export includes completed items and keeps each account and list separate.</p>
      <div data-export-guide></div>
    </details>
    <label>Reminders export <input type="file" accept=".json,application/json" data-file></label>
    <p class="note">Preview sends the selected lists to the Life account you’re signed in to.</p>
    <label data-accounts-label hidden>Source account <select data-accounts aria-label="Source account"></select></label>
    <fieldset data-lists hidden><legend>Lists to import</legend><div data-list-options></div></fieldset>
    <div data-preview-results></div>
    <p role="status" aria-live="polite"></p>
    <div class="actions"><button type="button" data-close>Close</button><button type="button" data-preview disabled>Preview import</button><button type="button" data-apply hidden>Import reminders</button></div>`;
  host.append(dialog);
  const field = key => dialog.querySelector('[data-'+key+']');
  const file = field('file'), select = field('accounts'), boxes = field('list-options');
  const preview = field('preview'), apply = field('apply'), close = field('close');
  const status = message => { dialog.querySelector('[role=status]').textContent = message; };
  let accounts = [], plan, operation, busy = false, reading = 0;
  const guide = field('export-guide');
  if (window.desktop) {
    guide.innerHTML = `<p>Download both files into Downloads. In Terminal on that Mac, run the commands below. If Swift is missing, install Apple’s Command Line Tools first. Allow Reminders access when macOS prompts, then choose Apple Reminders Export.json from Downloads.</p>
      <div class="actions"><a href="/apple-reminders-export.swift" download>Download exporter</a><a href="/apple-reminders-export.plist" download>Download permissions file</a></div><pre data-command></pre>`;
    field('command').textContent = [
      '(cd "$HOME/Downloads" || exit',
      'umask 077; set -C',
      'work=$(mktemp -d) || exit',
      'trap \'rm -f "$work/export" "$work/reminders.json"; rmdir "$work"\' EXIT',
      'swiftc -parse-as-library apple-reminders-export.swift \\',
      '  -Xlinker -sectcreate -Xlinker __TEXT -Xlinker __info_plist \\',
      '  -Xlinker apple-reminders-export.plist -o "$work/export" && \\',
      '  "$work/export" > "$work/reminders.json" && cat "$work/reminders.json" > "Apple Reminders Export.json")',
    ].join('\n');
  } else {
    guide.textContent = 'In Proteus desktop on a Mac, open Reminders → Import reminders for the exporter and commands. Choose the exported JSON here.';
  }
  function chooseLists() {
    clearPlan();
    boxes.replaceChildren();
    const account = accounts[select.value];
    field('lists').hidden = !account;
    for (const [index, list] of (account?.lists ?? []).entries()) {
      const label=document.createElement('label'), box=document.createElement('input');
      label.className='checkbox-row';box.type='checkbox';box.checked=true;box.value=index;
      label.append(box,list.name+' ('+list.items.length+')');boxes.append(label);
    }
    controls();
  }
  function clearPlan() {
    plan = null;
    field('preview-results').replaceChildren();
    status('');
  }
  function controls() {
    const locked = busy || !!operation;
    file.disabled = locked;select.disabled = locked;
    boxes.querySelectorAll('input').forEach(input => { input.disabled = locked; });
    preview.disabled = locked || !boxes.querySelector(':checked');
    apply.hidden = !plan;apply.disabled = busy || !plan?.total;
    apply.textContent = operation?'Retry same import':'Import reminders';
    close.disabled = locked;
  }
  file.onchange = async () => {
    const token = ++reading, chosen = file.files[0];
    accounts = [];select.replaceChildren();field('accounts-label').hidden = true;chooseLists();
    if (!chosen) return;
    try {
      if (chosen.size > 12_000_000) throw Error('Choose an export file under 12 MB.');
      const value = JSON.parse(await chosen.text());
      if (token !== reading || !dialog.open || !isCurrent()) return;
      const input = Array.isArray(value?.accounts)?value.accounts:[value];
      if (!input.length || input.length > 200 || input.some(row=>row?.format!==format||typeof row.sourceName!=='string'||!Array.isArray(row.lists)||row.lists.some(list=>typeof list?.name!=='string'||!Array.isArray(list.items)))) {
        throw Error('Choose an Apple Reminders export or a Proteus Reminders v1 JSON file.');
      }
      accounts=input;
      select.replaceChildren(new Option('Choose an account',''),...accounts.map((row,index)=>new Option(row.sourceName,String(index))));
      field('accounts-label').hidden=false;
    } catch (error) { if (token === reading) status(error.message); }
  };
  select.onchange=chooseLists;
  boxes.onchange=()=>{clearPlan();controls();};
  preview.onclick=async()=>{
    clearPlan();busy=true;controls();
    const account=accounts[select.value];
    try {
      const input={source:JSON.stringify({...account,lists:[...boxes.querySelectorAll(':checked')].map(box=>account.lists[box.value])})};
      if (new TextEncoder().encode(input.source).length>800000) throw Error('Select fewer lists to keep this import under 800 KB.');
      status('Preparing import preview…');
      const result=await write('import.preview',input,crypto.randomUUID());
      if (!isCurrent()) return;
      if (!Array.isArray(result.lists)||typeof result.digest!=='string') throw Error('This Life server does not support reminder imports yet.');
      plan={input:{...input,digest:result.digest},total:result.createdLists+result.createdItems};
      const list=document.createElement('ul');
      for (const row of result.lists) {
        const item=document.createElement('li');
        item.textContent=row.source+' → '+row.destination+' · '+row.open+' open · '+row.completed+' completed · '+row.skipped+' skipped'+(row.deletedList?' · previously imported list was deleted':'');
        list.append(item);
      }
      const notes=document.createElement('p');
      const extras=result.lists.reduce((n,row)=>n+row.withExtras,0),timed=result.lists.reduce((n,row)=>n+row.timed,0);
      notes.textContent=(extras?extras+' items contain extra Apple metadata kept in the export file. ':'')+(timed?timed+' open timed reminders will follow Proteus’s normal alert rules.':'');
      field('preview-results').append(list,notes);
      status(count(result.createdLists,'list')+' and '+count(result.createdItems,'reminder')+' will be added.');
    } catch (error) { if (isCurrent()) status(error.message); }
    finally { busy=false;controls(); }
  };
  apply.onclick=async()=>{
    if (busy || !plan?.total) return;
    operation??=crypto.randomUUID();busy=true;controls();status('Importing reminders…');
    try {
      const result=await write('import.apply',plan.input,operation);
      if (!isCurrent()) return;
      operation=null;clearPlan();
      status('Imported '+count(result.createdItems,'reminder')+'. Created '+count(result.createdLists,'list')+'.');
      void refresh();
    } catch (error) {
      if (!isCurrent()) return;
      if (error.status===409 || error.status===422 || error.code==='LIFE_SAVE_REJECTED') {
        operation=null;clearPlan();status(error.message);
      } else {
        status(error.message+' Retry this import to check the same request.');
      }
    } finally { busy=false;controls(); }
  };
  close.onclick=()=>dialog.close();
  dialog.addEventListener('cancel',event=>{if(busy||operation)event.preventDefault();});
  return {open:()=>{if(!dialog.open)dialog.showModal();},destroy:()=>{reading++;dialog.remove();}};
}
