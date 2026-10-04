<section class="card"><h2>Daily averages by period</h2><p class="muted">Only complete days with breakfast, lunch, and dinner recorded count. Explicit skipped-meal entries count toward completeness; snacks are included in the totals. Each complete day has equal weight. Partial and unlogged days are excluded.</p>
<div class="table-wrap"><table class="nutrition-table"><caption class="sr-only">Average macros per complete day</caption><thead><tr><th scope="col">Period</th><th scope="col" class="numeric">Complete days</th>@foreach($macros as $key => $label)<th scope="col" class="numeric">{{ $label }}<small>{{ $key === 'calories' ? 'kcal' : 'g' }} / day</small></th>@endforeach</tr></thead><tbody>
@foreach($periods as $label => $period)<tr><th scope="row">{{ $label }}@if($period['complete_days'])<small>{{ $period['first_date'] }} to {{ $period['last_date'] }}</small>@endif</th><td class="numeric">{{ $period['complete_days'] }}</td>@foreach($macros as $key => $macro)<td class="numeric">{{ $period['complete_days'] ? number_format($period[$key], $key === 'calories' ? 0 : 1) : '—' }}</td>@endforeach</tr>@endforeach
</tbody></table></div></section>
<section class="card section"><h2>Monthly averages</h2><p class="muted">Per complete day within each month. Only months with complete days appear; entry counts and calorie totals include those days only.</p>
@if($months->count())
    <div class="table-wrap"><table class="nutrition-table"><caption class="sr-only">Monthly averages and calorie totals for complete days</caption><thead><tr><th scope="col">Month</th><th scope="col" class="numeric">Complete days</th>@foreach($macros as $key => $label)<th scope="col" class="numeric">{{ $label }}<small>{{ $key === 'calories' ? 'kcal' : 'g' }} / day</small></th>@endforeach<th scope="col" class="numeric">Complete-day total<small>kcal</small></th></tr></thead><tbody>
    @foreach($months as $month)<tr><th scope="row">{{ \Illuminate\Support\Carbon::parse($month->month.'-01')->format('F Y') }}<small>{{ $month->entry_count }} food entries</small></th><td class="numeric">{{ $month->complete_days }}</td>@foreach($macros as $key => $label)<td class="numeric">{{ number_format($month->$key, $key === 'calories' ? 0 : 1) }}</td>@endforeach<td class="numeric">{{ number_format($month->calories_total) }}</td></tr>@endforeach
    </tbody></table></div>{{ $months->links('partials.pagination') }}
@else
    <div class="empty">Monthly averages will appear after you record a complete day.</div>
@endif
</section>
