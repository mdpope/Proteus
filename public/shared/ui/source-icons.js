// Shared source taxonomy: shapes remain distinct without relying on color or labels.
const paths={
 instruction:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h6"/>',
 skill:'<path d="m12 2 2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5zM20 2v4M18 4h4M4 18v4M2 20h4"/>',
 agent:'<path d="M12 7V3H9M2 12v5m20-5v5"/><rect x="4" y="7" width="16" height="14" rx="3"/><path d="M9 11v3m6-3v3m-6 3h6"/>',
 mcp:'<path d="M8 3v5m8-5v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/>',
 file:'<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6"/>'
};
export function sourceKindIcon(kind){const type=Object.hasOwn(paths,kind)?kind:'file';return `<span class="source-kind-icon source-kind-${type}" data-source-kind-icon="${type}" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[type]}</svg></span>`;}
