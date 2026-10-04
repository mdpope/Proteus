<section class="card"><div class="row section-heading"><div><h2>Your food library</h2><p class="muted">{{ number_format($foods->total()) }} {{ $search === '' ? 'foods' : 'matching foods' }} · values per serving</p></div><form method="get" class="inline-form"><input type="hidden" name="tab" value="foods"><label><span class="sr-only">Search foods</span><input type="search" name="search" value="{{ $search }}" placeholder="Search foods"></label><button class="secondary">Search</button></form></div>
@if($foods->count())
    <div class="table-wrap"><table class="nutrition-table"><caption class="sr-only">Food library with macros per serving</caption><thead><tr><th scope="col">Food / serving</th>@foreach($macros as $key => $label)<th scope="col" class="numeric">{{ $label }}<small>{{ $key === 'calories' ? 'kcal' : 'g' }}</small></th>@endforeach</tr></thead><tbody>
    @foreach($foods as $food)<tr><th scope="row">{{ $food->name }}<small>{{ $food->serving }}</small></th>@foreach($macros as $key => $label)<td class="numeric">{{ $food->currentVersion ? number_format($food->currentVersion->$key, $key === 'calories' ? 0 : 1) : '—' }}</td>@endforeach</tr>@endforeach
    </tbody></table></div>{{ $foods->links('partials.pagination') }}
@else
    <div class="empty">{{ $search === '' ? 'Your food library is empty.' : 'No foods match your search.' }}</div>
@endif
</section>
<section class="card section"><h2>Add or update a food</h2><p class="muted">Enter values per serving. Use an existing name to update that food; past meals keep their recorded values.</p><form method="post" action="{{ route('foods.store') }}" class="stack">
    @csrf
    <div class="form-grid"><label>Name<input name="name" value="{{ old('name') }}" maxlength="200" required></label><label>Serving size<input name="serving" value="{{ old('serving') }}" placeholder="1 cup, 100 g, or 1 package" maxlength="200" required></label></div><div class="form-grid">
    @foreach($macros as $key => $label)<label>{{ $label }} · {{ $key === 'calories' ? 'kcal' : 'g' }}<input name="{{ $key }}" value="{{ old($key) }}" type="number" min="0" step="0.001" required></label>@endforeach
    </div><button class="secondary">Save food</button>
</form></section>
