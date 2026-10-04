
@extends('layouts.app')
@section('title','Garage')
@section('content')<header class="top"><div><div class="eyebrow">Your everyday things, remembered</div><h1>The garage</h1><p>Maintenance, miles, and the paperwork that goes with them.</p></div><a class="button" href="{{ route('captures.create') }}">＋ Add a record</a></header>
<div class="grid three">
@forelse($vehicles as $vehicle)<a class="card link" href="{{ route('vehicles.show',$vehicle) }}"><div class="vehicle-mark">
@include('partials.vehicle-art')<span class="pill">{{ ucfirst($vehicle->kind) }}</span></div><h2>{{ $vehicle->name }}</h2><small>{{ $vehicle->year ?? 'Year not recorded' }} · {{ $vehicle->fuel_type ? ucfirst($vehicle->fuel_type) : 'Towable' }}</small><div class="stats"><div class="stat"><strong>{{ $vehicle->services_count }}</strong><span>History entries</span></div><div class="stat"><strong>{{ $vehicle->tasks->count() }}</strong><span>Open tasks</span></div></div><p class="shortcut">View history & details ↗</p></a>
@empty<div class="empty">Your vehicles will appear here after import.</div>
@endforelse</div>
<div class="card section"><div class="row"><div><div class="eyebrow">Build a useful history</div><h2>Keep the receipt. Remember the work.</h2><p class="muted">Add a repair, a part purchase, a fill-up, or an odometer photo. Purchases stay separate from completed maintenance.</p></div><a class="button secondary" href="{{ route('captures.index') }}">Open inbox</a></div></div>
@endsection
