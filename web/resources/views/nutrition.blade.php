@extends('layouts.app')
@section('title', 'Nutrition')
@section('content')
<header class="top">
    <div><div class="eyebrow">Personal to you</div><h1>Nutrition</h1><p>Your meal history, patterns, and food library.</p></div>
    <a class="button secondary" href="{{ route('nutrition', ['tab' => 'day']) }}">Log a meal</a>
</header>
<nav class="section-tabs" aria-label="Nutrition sections">
    @foreach(['days' => 'Meal days', 'day' => 'Daily log', 'averages' => 'Averages', 'foods' => 'Food library'] as $key => $label)
        <a href="{{ route('nutrition', array_filter(['tab' => $key, 'from' => $from, 'through' => $through])) }}" @if($tab === $key) aria-current="page" class="active" @endif>{{ $label }}</a>
    @endforeach
</nav>
@if(in_array($tab, ['days', 'averages']))
<form class="nutrition-filters card" method="get" aria-label="Filter nutrition dates">
    <input type="hidden" name="tab" value="{{ $tab }}">
    <label>From<input type="date" name="from" value="{{ $from }}"></label>
    <label>Through<input type="date" name="through" value="{{ $through }}"></label>
    <button type="submit">Apply range</button>
    @if($from || $through)<a class="button secondary" href="{{ route('nutrition', ['tab' => $tab]) }}">Clear range</a>@endif
</form>
@endif
@include('nutrition.'.$tab)
@endsection
