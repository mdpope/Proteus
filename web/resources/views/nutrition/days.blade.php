<section class="card">
    <div class="row"><div><h2>Every recorded day</h2><p class="muted">{{ number_format($days->total()) }} days with meal entries · newest first</p></div><span class="pill">{{ number_format($entryCount) }} food entries</span></div>
    @if($days->count())
        <div class="table-wrap"><table class="nutrition-table"><caption class="sr-only">Meal days with daily macro totals and foods</caption><thead><tr><th scope="col">Day</th>@foreach($macros as $key => $label)<th scope="col" class="numeric">{{ $label }}<small>{{ $key === 'calories' ? 'kcal' : 'g' }}</small></th>@endforeach<th scope="col">Food items</th></tr></thead><tbody>
        @foreach($days as $day)
            <tr><th scope="row"><a class="day-link" href="{{ route('nutrition', ['date' => $day->date]) }}">{{ \Illuminate\Support\Carbon::parse($day->date)->format('M j, Y') }}</a><small>{{ $day->entry_count }} {{ $day->entry_count == 1 ? 'entry' : 'entries' }}</small></th>
            @foreach($macros as $key => $label)<td class="numeric">{{ number_format($day->$key, $key === 'calories' ? 0 : 1) }}</td>@endforeach
            <td class="food-preview">@foreach($dayFoods->get($day->date, collect())->take(4) as $entry)<span>{{ $entry->version->food->name }}</span>@endforeach @if($day->entry_count > 4)<a class="shortcut" href="{{ route('nutrition', ['date' => $day->date]) }}">+{{ $day->entry_count - 4 }} more</a>@endif</td></tr>
        @endforeach
        </tbody></table></div>
        {{ $days->links('partials.pagination') }}
    @else
        <div class="empty">No meal days yet. Log your first meal to start your history.</div>
    @endif
</section>
@if($summary['complete_days'])
    <section class="section"><h2>Daily averages</h2><p class="muted">Across all {{ $summary['complete_days'] }} complete days with breakfast, lunch, and dinner recorded. Snacks are included; partial and unlogged days are excluded.</p><div class="numbers">
    @foreach($macros as $key => $label)<div class="card"><small>{{ $label }}</small><strong>{{ number_format($summary[$key], $key === 'calories' ? 0 : 1) }}</strong><small>{{ $key === 'calories' ? 'kcal' : 'g' }} per complete day</small></div>@endforeach
    </div></section>
@endif
