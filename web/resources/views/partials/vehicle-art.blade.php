<svg viewBox="0 0 150 70" fill="none" aria-hidden="true">
@if($vehicle->kind==='trailer')
<path d="M17 10h99v39H62v8H17V10Z" fill="currentColor" opacity=".13"/><path d="M17 10h99v39H62v8H17V10Zm99 27h18v17m0-5h9M28 19h22v15H28zm34 0h21v15H62zm33 0h12v23H95Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="39" cy="56" r="8" fill="#fffef8" stroke="currentColor" stroke-width="2.2"/><circle cx="59" cy="56" r="8" fill="#fffef8" stroke="currentColor" stroke-width="2.2"/>
@elseif($vehicle->kind==='atv')
<path d="m25 33 29-9h30l22 11 18 2-4 13H27l-2-17Z" fill="currentColor" opacity=".13"/><path d="m25 33 29-9h30l22 11 18 2-4 13H27l-2-17ZM54 24l9 20h24l13-16M82 24l-5-13h-12M20 30h27m51 2h29" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><circle cx="39" cy="51" r="14" fill="#fffef8" stroke="currentColor" stroke-width="3"/><circle cx="109" cy="51" r="14" fill="#fffef8" stroke="currentColor" stroke-width="3"/>
@else
<path d="M12 47v-14l17-5 10-15h44l18 18 28 4 8 12v7H12v-7Z" fill="currentColor" opacity=".13"/><path d="M12 47v-14l17-5 10-15h44l18 18 28 4 8 12v7H12v-7Z" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/><path d="M39 17 30 30h61L79 17H39ZM60 18v12" stroke="currentColor" stroke-width="2"/><circle cx="36" cy="53" r="10" fill="#fffef8" stroke="currentColor" stroke-width="2.2"/><circle cx="112" cy="53" r="10" fill="#fffef8" stroke="currentColor" stroke-width="2.2"/><circle cx="36" cy="53" r="4" fill="currentColor"/><circle cx="112" cy="53" r="4" fill="currentColor"/>
@endif
</svg>
