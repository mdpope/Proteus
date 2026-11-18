@extends('layouts.app')
@section('title', 'Overview · Life')
@section('content')
<section id="life-overview">
    <header class="top"><div><h1>Overview</h1><p>Your personal records, nutrition and recent activity.</p></div><button type="button" id="life-overview-refresh">Refresh</button></header>
    <div id="life-overview-content" aria-live="polite"></div>
</section>
@endsection
