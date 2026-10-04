<div class="row section-heading"><h2>{{ \Illuminate\Support\Carbon::parse($date)->format('l, F j, Y') }}</h2><form method="get" class="inline-form"><input type="hidden" name="tab" value="day"><label><span class="sr-only">Date</span><input type="date" name="date" value="{{ $date }}" required></label><button class="secondary">View day</button></form></div>
<div class="numbers">
@foreach($totals as $key => $value)<div class="card"><small>{{ $macros[$key] }}</small><strong>{{ number_format($value, $key === 'calories' ? 0 : 1) }}</strong><small>{{ $key === 'calories' ? 'kcal' : 'grams' }}</small></div>@endforeach
</div>
<div class="grid"><section class="card timeline"><h2>Food entries</h2>
@forelse($meals as $meal)
    <article class="item"><div class="row"><h3>{{ $meal->version->food->name }}</h3><span class="pill">{{ ucfirst($meal->meal) }}</span></div><p>{{ $meal->qty }} × {{ $meal->unit }}</p><p class="macro-line">@foreach($macros as $key => $label)<span>{{ number_format($meal->qty * $meal->version->$key, $key === 'calories' ? 0 : 1) }} {{ $key === 'calories' ? 'kcal' : 'g '.strtolower($label) }}</span>@endforeach</p>
    @if($meal->note)<p class="muted">{{ $meal->note }}</p>@endif
    @if($meal->migration_baseline)<small>Nutrition preserved at migration.</small>@endif</article>
@empty
    <div class="empty">No meals logged for this day.</div>
@endforelse
</section><section class="card"><h2>Log a meal</h2><form method="post" action="{{ route('meals.store') }}" class="stack">
    @csrf
    <input type="hidden" name="idempotency_key" value="{{ old('idempotency_key', (string)\Illuminate\Support\Str::uuid()) }}"><input type="hidden" name="date" value="{{ $date }}">
    <label>Food<select name="food_id" required><option value="">Choose from your library</option>@foreach($foods as $food)<option value="{{ $food->id }}" @selected(old('food_id') == $food->id)>{{ $food->name }} · {{ $food->serving }}</option>@endforeach</select></label>
    <div class="form-grid"><label>Meal<select name="meal">@foreach(['breakfast', 'lunch', 'dinner', 'snack'] as $meal)<option @selected(old('meal') === $meal)>{{ $meal }}</option>@endforeach</select></label><label>Servings<input name="qty" type="number" step="0.001" value="{{ old('qty', 1) }}" min="0.001" required></label></div>
    <label>Note<textarea name="note">{{ old('note') }}</textarea></label><button>Log meal</button>
</form><p><a class="shortcut" href="{{ route('nutrition', ['tab' => 'foods']) }}">Add or update a food in your library →</a></p></section></div>
