
@extends('layouts.app')
@section('title','Fuel & mileage')
@section('content')<header class="top"><div><div class="eyebrow">Every mile adds up</div><h1>Fuel & mileage</h1><p>Measured economy from complete fill-ups, with room for partial fills and missed stops.</p></div><a class="button" href="{{ route('captures.create',['kind'=>'fuel']) }}">＋ Log fill-up</a></header><div class="grid">
@foreach($vehicles as $vehicle)
@php($report=$reports[$vehicle->id])<section class="card"><div class="row"><h2>{{ $vehicle->name }}</h2><span class="pill">{{ ucfirst($vehicle->fuel_type) }}</span></div><div class="stats"><div class="stat"><strong>{{ $report['mpg']??'—' }}</strong><span>Weighted average MPG</span></div><div class="stat"><strong>{{ number_format($report['miles']) }}</strong><span>Miles in complete intervals</span></div></div>
@if(count($report['intervals']))<div class="table-wrap"><table><thead><tr><th>Through</th><th>Miles</th><th>Gallons</th><th>MPG</th></tr></thead><tbody>
@foreach(array_reverse($report['intervals']) as $interval)<tr><td>{{ substr($interval['to'],0,10) }}</td><td>{{ $interval['miles'] }}</td><td>{{ $interval['gallons'] }}</td><td>{{ $interval['mpg'] }}</td></tr>
@endforeach</tbody></table></div>
@else<p class="notice section">The first full tank sets a baseline. The next full tank completes the first MPG interval.</p>
@endif<details><summary>{{ $report['fills']->count() }} fill-up records</summary><div class="table-wrap"><table><thead><tr><th>Date</th><th>Odometer</th><th>Gallons</th><th>Fill</th></tr></thead><tbody>
@foreach($report['fills']->reverse() as $fill)<tr><td>{{ $fill->filled_at->format('M j, Y') }}</td><td>{{ number_format($fill->odometer,1) }}</td><td>{{ $fill->gallons }}</td><td>{{ $fill->full_tank?'Full':'Partial' }}{{ $fill->missed_fill?' · Gap':'' }}</td></tr>
@endforeach</tbody></table></div></details><p><a class="shortcut" href="{{ route('vehicles.show',$vehicle) }}">Monthly & yearly mileage →</a></p></section>
@endforeach</div><p class="notice section">Average MPG = total distance ÷ total fuel across valid intervals. Dashboard MPG remains a separate observation. Missing fills start a fresh baseline; partial fills are included in the next full-to-full interval.</p>
@endsection
