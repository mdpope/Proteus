const paths={
 overview:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
 ask:'M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-1-2V6a2 2 0 0 1 2-2zM7 9v3m3-5v7m4-6v5m3-4v3',
 home:'m3 10 9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
 nutrition:'M4 3v5a3 3 0 0 0 6 0V3M7 3v18m12-18c-3 1-4 4-4 8h4m0-8v18',
 garage:'m5 10 2-5h10l2 5m-16 1 2-1h14l2 1v6H3zm2 6v3m14-3v3M6 14h2m8 0h2',
 inbox:'M3 15l3-9h12l3 9v5H3zm0 0h5l2 2h4l2-2h5',
 capture:'M4 4h16v16H4zM12 8v8m-4-4h8',
 security:'M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0zM14.5 9.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM6.5 18c0-4 11-4 11 0',
 connections:'m9 15 6-6m-8 8-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0m2 10a4 4 0 0 0 6 0l5-5a4 4 0 0 0-6-6l-1 1',
 days:'M4 6h16v15H4zM8 3v6m8-6v6M4 11h16',
 day:'M6 3h12v18H6zM9 8h6m-6 4h6m-6 4h6',
 averages:'M4 4v16h16M8 16l4-5 4 2 4-7',
 fuel:'M4 21V4h10v17M3 21h12M6 7h6v5H6zm8 6h2l2 3h2v-5l-3-4',
};
export function lifeSectionIcon(id){
 return paths[id]?'<svg class="life-section-icon" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="'+paths[id]+'"/></svg>':'';
}
