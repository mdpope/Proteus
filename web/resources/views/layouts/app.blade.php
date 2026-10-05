<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="csrf-token" content="{{ csrf_token() }}"><title>@yield('title','Home') · Proteus</title>@vite(['resources/css/app.css','resources/js/app.js'])</head>
@php
    $sections = [
        'life' => ['label' => 'Life', 'url' => route('garage'), 'icon' => '♡'],
        'chats' => ['label' => 'Chats', 'url' => route('remote', ['view' => 'chats']), 'icon' => '🗪'],
        'attention' => ['label' => 'Needs attention', 'url' => route('remote', ['view' => 'chats','attention'=>1]), 'icon' => '!'],
        'transcription' => ['label' => 'Transcription', 'url' => route('remote', ['view'=>'schedules','transcription'=>1]), 'icon' => '≋'],
        'schedules' => ['label' => 'Schedules', 'url' => route('remote', ['view' => 'schedules']), 'icon' => '◷'],
        'workspaces' => ['label' => 'Workspaces', 'url' => route('remote', ['view' => 'workspaces']), 'icon' => '▦'],
        'inbox' => ['label' => 'Inbox', 'url' => route('captures.index'), 'icon' => '▤'],
        'fuel' => ['label' => 'Fuel & mileage', 'url' => route('fuel'), 'icon' => '◇'],
        'nutrition' => ['label' => 'Nutrition', 'url' => route('nutrition'), 'icon' => '◌'],
        'team' => ['label' => 'Team Tools', 'url' => route('team'), 'icon' => '☷'],
        'browser-home' => ['label' => 'Browse', 'url' => route('browser-home'), 'icon' => '⊕'],
        'engine-room' => ['label' => 'Engine Room', 'url' => route('engine-room'), 'icon' => '⚙'],
        'connections' => ['label' => 'Connections', 'url' => route('connections'), 'icon' => '⇄'],
        'security' => ['label' => 'Account & Security', 'url' => route('security'), 'icon' => '⚙'],
    ];
    $section = match (true) {
        request()->routeIs('remote') && request()->query('attention') === '1' => 'attention',
        request()->routeIs('remote') && request()->query('transcription') === '1' => 'transcription',
        request()->routeIs('remote') => in_array(request()->query('view'), ['chats', 'schedules', 'workspaces'], true) ? request()->query('view') : 'chats',
        request()->routeIs('captures.*') => 'inbox', request()->routeIs('fuel') => 'fuel',
        request()->routeIs('nutrition', 'foods.*', 'meals.*') => 'nutrition',
        request()->routeIs('team') => 'team', request()->routeIs('browser-home') => 'browser-home',
        request()->routeIs('engine-room') => 'engine-room', request()->routeIs('connections') => 'connections',
        request()->routeIs('security', 'security.*') => 'security', default => 'life',
    };
    $activeFeature = in_array($section,['life','inbox','fuel','nutrition']) ? 'life' : (in_array($section,['engine-room','security','connections']) ? 'engine-room' : $section);
@endphp
<body data-browser-account="{{ hash_hmac('sha256', 'proteus-browser:'.auth()->id(), config('app.key')) }}" data-shell-section="{{ $section }}" data-active-feature="{{ $activeFeature }}">
<a class="shell-skip" href="#main-content">Skip to content</a><div class="shell"><aside class="sidebar">
    <a class="brand" href="{{ route('garage') }}"><span aria-hidden="true">⤨</span> <span class="rail-label">Proteus</span></a>
    <button id="shell-rail-toggle" class="rail-toggle" aria-label="Collapse sidebar">‹</button>
    <nav aria-label="Main navigation">
        @foreach(['schedules','chats','attention','transcription','life','team','workspaces','engine-room'] as $key)
            <a data-shell-nav="{{ $key }}" title="{{ $sections[$key]['label'] }}" class="{{ $activeFeature === $key ? 'active' : '' }}" href="{{ $sections[$key]['url'] }}" @if($activeFeature === $key) aria-current="page" @endif><span aria-hidden="true">@if($key === 'chats')<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 4h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8l-4 3v-4a3 3 0 0 1-1-2V4Z"/><path d="M17 8h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3l-3 2v-4"/></svg>@else{{ $sections[$key]['icon'] }}@endif</span><span class="rail-label">{{ $sections[$key]['label'] }}</span></a>
            @if($key === 'life' && $activeFeature === 'life')<div class="shell-subitems rail-label"><a href="{{ route('garage') }}">Garage</a>@foreach(['nutrition','fuel','inbox'] as $child)<a data-shell-nav="{{ $child }}" href="{{ $sections[$child]['url'] }}">{{ $sections[$child]['label'] }}</a>@endforeach</div>@endif
            @if($key === 'chats')<div id="shell-recent-chats" class="shell-subitems rail-label" @if($activeFeature !== 'chats') hidden @endif><a href="{{ route('remote',['view'=>'chats']) }}">More</a></div>@endif
            @if($key === 'team' && $activeFeature === 'team')<div class="shell-subitems rail-label"><a href="{{ route('team') }}">Overview</a><a href="{{ route('team',['standup'=>1]) }}">Standup</a><a href="{{ route('browser-home') }}" target="_blank" rel="noopener">Browse ↗</a></div>@endif
            @if($key === 'engine-room' && $activeFeature === 'engine-room')<div class="shell-subitems rail-label">@foreach(['resources'=>'Resources','connections'=>'Connections','setup'=>'App Setup','usage'=>'Usage','notifications'=>'Notifications','logs'=>'Logs'] as $sub=>$label)<a href="{{ route('engine-room',['tab'=>$sub]) }}">{{ $label }}</a>@endforeach<a href="{{ route('security') }}">Account &amp; Security</a></div>@endif
        @endforeach
    </nav>
    <section id="web-provider-usage" hidden aria-label="AI Allowance"></section>
    <div class="account"><span class="account-name rail-label">{{ auth()->user()->name }}</span><form method="post" action="{{ route('logout') }}">@csrf<button>Sign out</button></form></div>
</aside><div class="shell-workspace"><nav id="shell-tabs" class="shell-tabs" aria-label="Open sections"><div class="shell-tab selected"><a href="{{ $sections[$section]['url'] }}" aria-current="page">{{ $sections[$section]['label'] }}</a></div></nav><a class="new-browser-tab" href="{{ route('browser-home') }}" target="_blank" rel="noopener" aria-label="New browser tab">⊕</a><main id="main-content" class="main" tabindex="-1">@include('partials.messages')@yield('content')</main></div></div>
<script type="application/json" id="shell-sections">@json($sections, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT)</script></body></html>
