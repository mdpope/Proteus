<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="csrf-token" content="{{ csrf_token() }}"><title>@yield('title','Home') · Proteus</title>@vite(['resources/css/app.css','resources/js/app.js'])</head>
@php
    $sections = [
        'life' => ['label' => 'Life', 'url' => route('garage'), 'icon' => '♡'],
        'chats' => ['label' => 'Chats', 'url' => route('remote', ['view' => 'chats']), 'icon' => '◉'],
        'schedules' => ['label' => 'Schedules', 'url' => route('remote', ['view' => 'schedules']), 'icon' => '◷'],
        'workspaces' => ['label' => 'Workspaces', 'url' => route('remote', ['view' => 'workspaces']), 'icon' => '▦'],
        'inbox' => ['label' => 'Inbox', 'url' => route('captures.index'), 'icon' => '▤'],
        'fuel' => ['label' => 'Fuel & mileage', 'url' => route('fuel'), 'icon' => '◇'],
        'nutrition' => ['label' => 'Nutrition', 'url' => route('nutrition'), 'icon' => '◌'],
        'connections' => ['label' => 'Connections', 'url' => route('connections'), 'icon' => '⇄'],
        'security' => ['label' => 'Account & security', 'url' => route('security'), 'icon' => '⚙'],
    ];
    $section = match (true) {
        request()->routeIs('remote') => in_array(request()->query('view'), ['chats', 'schedules', 'workspaces'], true) ? request()->query('view') : 'chats',
        request()->routeIs('captures.*') => 'inbox',
        request()->routeIs('fuel') => 'fuel',
        request()->routeIs('nutrition', 'foods.*', 'meals.*') => 'nutrition',
        request()->routeIs('connections') => 'connections',
        request()->routeIs('security', 'security.*') => 'security',
        default => 'life',
    };
@endphp
<body data-browser-account="{{ hash_hmac('sha256', 'proteus-browser:'.auth()->id(), config('app.key')) }}" data-shell-section="{{ $section }}">
<a class="shell-skip" href="#main-content">Skip to content</a>
<div class="shell">
<aside class="sidebar">
    <a class="brand" href="{{ route('garage') }}"><span aria-hidden="true">⤨</span> Proteus</a>
    <div class="eyebrow">Your agent control room</div>
    <nav aria-label="Main navigation">
        @foreach(['chats','schedules','workspaces','life','inbox','fuel','nutrition','connections','security'] as $key)
            <a data-shell-nav="{{ $key }}" class="{{ $section === $key ? 'active' : '' }}" href="{{ $sections[$key]['url'] }}" @if($section === $key) aria-current="page" @endif><span aria-hidden="true">{{ $sections[$key]['icon'] }}</span><span>{{ $key === 'life' ? 'Life · Garage' : $sections[$key]['label'] }}</span></a>
        @endforeach
    </nav>
    <section id="web-provider-usage" hidden aria-label="AI usage"></section>
    <div class="account"><span class="account-name">{{ auth()->user()->name }}<small>Your private workspace</small></span><form method="post" action="{{ route('logout') }}">@csrf<button>Sign out</button></form></div>
</aside>
<div class="shell-workspace">
    <nav id="shell-tabs" class="shell-tabs" aria-label="Open sections">
        <div class="shell-tab {{ $section === 'life' ? 'selected' : '' }}"><a href="{{ $sections['life']['url'] }}" @if($section === 'life') aria-current="page" @endif><span aria-hidden="true">♡</span> Life</a></div>
        @if($section !== 'life')<div class="shell-tab selected"><a href="{{ $sections[$section]['url'] }}" aria-current="page">{{ $sections[$section]['label'] }}</a></div>@endif
    </nav>
    <main id="main-content" class="main" tabindex="-1">@include('partials.messages')@yield('content')<div class="foot">Your records. Your history. One place.</div></main>
</div>
</div>
<script type="application/json" id="shell-sections">@json($sections, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT)</script>
</body></html>
