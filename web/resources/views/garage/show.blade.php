
@extends('layouts.app')
@section('title',$vehicle->name)
@section('content')<header class="top"><div><div class="eyebrow"><a href="{{ route('garage') }}">← Garage</a></div><h1>{{ $vehicle->name }}</h1><p>{{ $vehicle->notes }}</p></div><a class="button" href="{{ route('captures.create',['vehicle'=>$vehicle->id]) }}">＋ Add a record</a></header>
<div class="numbers"><div class="card"><small>Last recorded odometer</small><strong>{{ $report['latest_observation'] ? number_format($report['latest_observation']['miles']) : '—' }}</strong><small>{{ $report['latest_observation']['date'] ?? 'No reading yet' }}</small></div><div class="card"><small>Measured average MPG</small><strong>{{ $report['mpg'] ?? '—' }}</strong><small>Complete fill intervals only</small></div><div class="card"><small>Service & purchase records</small><strong>{{ $vehicle->services->count() }}</strong><small>With their original dates</small></div><div class="card"><small>Open tasks</small><strong>{{ $vehicle->tasks->where('status','open')->count() }}</strong><small>Planned or under observation</small></div></div>
@include('garage.oil-analysis')
<div class="grid"><section class="card timeline"><h2>Vehicle history</h2>
@forelse($vehicle->services as $record)<article class="item"><div class="row"><h3>{{ $record->title }}</h3><span class="pill">{{ ucfirst($record->kind) }}</span></div><small>{{ $record->occurred_on?->format(match($record->date_precision){'month'=>'M Y','year'=>'Y',default=>'M j, Y'}) ?? 'Date not recorded' }}
@if($record->odometer) · {{ $record->odometer_approximate ? 'About ' : '' }}{{ number_format($record->odometer) }} mi
@endif 
@if($record->cost !== null) · ${{ number_format($record->cost,2) }}
@endif</small><p>{{ $record->notes }}</p>
@if($record->vendor)<small>{{ $record->vendor }}</small>
@endif 
@if($record->capture_id)<p><a class="shortcut" href="{{ route('captures.show',$record->capture_id) }}">Receipt & original evidence →</a></p>
@endif</article>
@empty<p class="muted">No dated service history has been recorded.</p>
@endforelse</section><section class="stack"><div class="card"><h2>What’s next</h2>
@forelse($vehicle->tasks->where('status','open') as $task)<div class="item"><h3>{{ $task->title }}</h3><p class="muted">{{ $task->notes }}</p>
@if($task->due_on || $task->due_odometer)<p><small>Due {{ $task->due_on?->format('M j, Y') }} {{ $task->due_odometer ? ' / '.number_format($task->due_odometer).' mi' : '' }}</small></p>
@endif<form method="post" action="{{ route('tasks.complete',[$vehicle,$task]) }}">
@csrf<button class="secondary">Mark complete</button></form></div>
@empty<p class="muted">No open tasks.</p>
@endforelse<details><summary>Add a maintenance task</summary><form method="post" action="{{ route('tasks.store',$vehicle) }}" class="stack">
@csrf<label>Task<input name="title" required></label><label>Notes<textarea name="notes"></textarea></label><div class="form-grid"><label>Due date<input type="date" name="due_on"></label><label>Due at odometer<input type="number" name="due_odometer" min="0"></label></div><button>Save task</button></form></details></div><div class="card"><h2>Mileage over time</h2><p class="muted">Estimated from dated odometer readings. Miles between readings are spread evenly across their dates; months without coverage stay unknown.</p>
@forelse(array_slice($report['monthly_estimates'],-12,null,true) as $month=>$miles)<div class="row"><span>{{ $month }}</span><strong>{{ number_format($miles) }} mi</strong></div>
@empty<p class="notice">Add two dated odometer readings to begin.</p>
@endforelse 
@foreach($report['yearly_estimates'] as $year=>$miles)<p><strong>{{ $year }}</strong> · {{ number_format($miles) }} miles within recorded coverage</p>
@endforeach</div></section></div>
@endsection
