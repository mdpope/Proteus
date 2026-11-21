const names = new Intl.Collator(undefined, {numeric: true, sensitivity: 'base'});

export function orderedComputers(rows, ids = [], localId = null) {
  const ranks = new Map(ids.map((id, index) => [id.toLowerCase(), index]));
  const rank = id => id === localId || id === 'local' ? -1 : ranks.get(id?.toLowerCase()) ?? Infinity;
  const id = row => row.hostId || row.id;
  const label = row => row.label || row.name || row.hostName || '';
  return [...rows].sort((a, b) => rank(id(a)) - rank(id(b)) ||
    names.compare(label(a), label(b)) || names.compare(id(a), id(b)));
}

// Used only by the isolated design demo when it has no paired computers.
export const demoComputerDestinations = [
  {hostId:'84b59b99-dd12-4fbf-ad7d-fd288fef1cac',label:'Design Mac',workspaceName:'Studio',projectName:'Design review'},
  {hostId:'a0cae129-4974-45db-a69a-34e867c71a31',label:'Studio PC',workspaceName:'Projects',projectName:'Release review'},
];
