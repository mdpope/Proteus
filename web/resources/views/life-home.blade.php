@extends('layouts.app')
@section('title','Smart Home · Life')
@section('content')
<nav class="feature-tab-bar" aria-label="Smart Home tabs">
    <button type="button" data-home-tab="smart" aria-current="page">Smart Home</button>
    <button type="button" data-home-tab="assistant">Home Assistant</button>
</nav>
<section id="life-home"><h1>Smart Home</h1><p>Connect your Default computer in Engine Room to control its Home Assistant devices.</p></section>
<section id="life-home-dashboard" hidden aria-label="Home Assistant dashboard"></section>
@endsection
