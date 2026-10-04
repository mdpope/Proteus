@extends('layouts.app')
@section('title', 'Nutrition')
@section('content')
<header class="top">
    <div><div class="eyebrow">Personal to you</div><h1>Nutrition</h1><p>Your meal history, patterns, and food library.</p></div>
    <a class="button secondary" href="{{ route('nutrition', ['tab' => 'day']) }}">Log a meal</a>
</header>
<nav class="section-tabs" aria-label="Nutrition sections">
    @foreach(['days' => 'Meal days', 'day' => 'Daily log', 'averages' => 'Averages', 'foods' => 'Food library'] as $key => $label)
        <a href="{{ route('nutrition', ['tab' => $key]) }}" @if($tab === $key) aria-current="page" class="active" @endif>{{ $label }}</a>
    @endforeach
</nav>
@include('nutrition.'.$tab)
@endsection
