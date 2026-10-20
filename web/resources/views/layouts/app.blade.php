<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="csrf-token" content="{{ csrf_token() }}"><title>@yield('title','Home') · Proteus</title>@vite(['resources/css/app.css','resources/js/app.js'])</head>
@php
    $sections = [
        'home' => ['label' => 'Home', 'url' => route('home'), 'icon' => '⌂'],
        'life' => ['label' => 'Life', 'url' => route('garage'), 'icon' => '♡'],
        'internet' => ['label' => 'Internet Searches', 'url' => route('remote', ['view' => 'chats', 'type' => 'internet']), 'icon' => '⌕'],
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
        request()->routeIs('remote') && request()->query('view') === 'connections' => 'engine-room',
        request()->routeIs('remote') => in_array(request()->query('view'), ['chats', 'schedules', 'workspaces'], true) ? request()->query('view') : 'chats',
        request()->routeIs('captures.*') => 'inbox', request()->routeIs('fuel') => 'fuel',
        request()->routeIs('nutrition', 'foods.*', 'meals.*') => 'nutrition',
        request()->routeIs('team') => 'team', request()->routeIs('browser-home') => 'browser-home',
        request()->routeIs('engine-room') => 'engine-room', request()->routeIs('connections') => 'connections',
        request()->routeIs('security', 'security.*') => 'security', request()->routeIs('home') => 'home', default => 'life',
    };
    $activeFeature = in_array($section,['life','inbox','fuel','nutrition']) ? 'life' : (in_array($section,['engine-room','security','connections']) ? 'engine-room' : $section);
    if ($section === 'chats' && request('type') === 'internet') { $activeFeature = 'internet'; }
@endphp
<body class="web-desktop-shell" data-browser-account="{{ hash_hmac('sha256', 'proteus-browser:'.auth()->id(), config('app.key')) }}" data-shell-section="{{ $section }}" data-active-feature="{{ $activeFeature }}">
<a class="shell-skip" href="#main-content">Skip to content</a><div class="shell"><aside class="sidebar">
    <a class="brand" href="{{ route('home') }}"><span aria-hidden="true">⤨</span> <span class="rail-label">Proteus</span></a>
    <button id="shell-rail-toggle" class="rail-toggle" aria-label="Collapse sidebar">‹</button>
    <nav class="shell-navigation" aria-label="Main navigation">
        @foreach(['home','schedules','chats','internet','attention','transcription','life','team','workspaces','engine-room'] as $key)
            <div class="shell-nav-group" data-feature="{{ $key }}">
            @if($key === 'workspaces')<div class="shell-workspaces-control">@endif
            <a data-shell-nav="{{ $key }}" title="{{ $sections[$key]['label'] }}" class="{{ $activeFeature === $key ? 'active' : '' }}" href="{{ $sections[$key]['url'] }}" @if($activeFeature === $key) aria-current="page" @endif><span class="nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">@switch($key)
                @case('home')<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"/><path d="M9 21v-7h6v7"/>@break
                @case('schedules')<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>@break
                @case('chats')<path d="M3 4h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8l-4 3v-4a3 3 0 0 1-1-2V4Z"/><path d="M17 8h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3l-3 2v-4"/>@break
                @case('internet')<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>@break
                @case('attention')<path d="M12 4v10M12 20h.01"/>@break
                @case('transcription')<path d="M2 10v4M6 7v10M10 3v18M14 8v8M18 5v14M22 10v4"/>@break
                @case('life')<path d="M20.8 9.2c0 4.2-8.8 10.4-8.8 10.4S3.2 13.4 3.2 9.2a4.7 4.7 0 0 1 8.8-2.1 4.7 4.7 0 0 1 8.8 2.1Z"/>@break
                @case('team')<path d="M3 5h6v3H3zM12 5h9v3h-9zM3 11h6v3H3zM12 11h9v3h-9zM3 17h6v3H3zM12 17h9v3h-9z" fill="currentColor" stroke="none"/>@break
                @case('workspaces')<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>@break
                @case('engine-room')<path d="m10 2-.5 2.1-1.7.8-1.9-1.1-2.4 2.4 1.1 1.9-.8 1.7L2 10v4l2.1.5.8 1.7-1.1 1.9 2.4 2.4 1.9-1.1 1.7.8.5 2.1h4l.5-2.1 1.7-.8 1.9 1.1 2.4-2.4-1.1-1.9.8-1.7L22 14v-4l-2.1-.5-.8-1.7 1.1-1.9-2.4-2.4-1.9 1.1-1.7-.8L14 2h-4Z"/><circle cx="12" cy="12" r="3"/>@break
                @endswitch</svg></span><span class="rail-label">{{ $sections[$key]['label'] }}</span>@if($key === 'chats')<span id="shell-running-chats" class="count" aria-label="0 running chats">0</span>@elseif(in_array($key, ['schedules','internet','attention']))<span class="count" data-feature-count="{{ $key }}" hidden></span>@endif</a>
            @if($key === 'workspaces')<button id="shell-collapse-workspaces" class="web-collapse-all rail-label" type="button" aria-label="Collapse all workspaces and projects" title="Collapse all"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="4" y="4" width="16" height="5" rx="1"/><rect x="4" y="15" width="16" height="5" rx="1"/></svg></button></div>@endif
            @if($key === 'life' && $activeFeature === 'life')<div class="shell-subitems rail-label"><a href="{{ route('garage') }}">Garage</a>@foreach(['nutrition','fuel','inbox'] as $child)<a data-shell-nav="{{ $child }}" href="{{ $sections[$child]['url'] }}">{{ $sections[$child]['label'] }}</a>@endforeach</div>@endif
            @if($key === 'schedules')<div id="shell-recent-schedules" class="shell-subitems rail-label" hidden></div>@endif
            @if($key === 'internet')<div id="shell-recent-internet" class="shell-subitems rail-label" hidden></div>@endif
            @if($key === 'attention')<div id="shell-recent-attention" class="shell-subitems rail-label" hidden></div>@endif
            @if($key === 'chats')<div id="shell-recent-chats" class="shell-subitems rail-label" @if($activeFeature !== 'chats') hidden @endif></div>@endif
            @if($key === 'team' && $activeFeature === 'team')<div class="shell-subitems rail-label"><a href="{{ route('team') }}">Overview</a><a href="{{ route('team',['standup'=>1]) }}">Standup</a><a href="{{ route('browser-home') }}" target="_blank" rel="noopener">Browse ↗</a></div>@endif
            @if($key === 'engine-room' && $activeFeature === 'engine-room')<div class="shell-subitems rail-label">@foreach(['sources'=>'Source library','resources'=>'Resources','connections'=>'Computer Connections','integrations'=>'Accounts & Integrations','setup'=>'App settings','preferences'=>'Browser settings','history'=>'Browser history','usage'=>'Usage','notifications'=>'Notifications','logs'=>'Logs'] as $sub=>$label)<a data-engine-tab="{{ $sub }}" href="{{ route('engine-room',['tab'=>$sub]) }}">{{ $label }}</a>@endforeach<a href="{{ route('security') }}">Account &amp; Security</a></div>@endif
            </div>
            @if($key === 'workspaces')<div id="shell-recent-workspaces" class="rail-label" hidden></div><hr class="shell-engine-divider">@endif
        @endforeach
    </nav>
    <div id="shell-sidebar-resizer" role="separator" tabindex="0" aria-orientation="vertical" aria-label="Resize sidebar" aria-valuemin="190" aria-valuemax="460" aria-valuenow="230"></div>
    <section id="web-provider-usage" hidden aria-label="AI Allowance"></section>
    @php
        $sidebarReleasePath = resource_path('release.json');
        $sidebarRelease = is_file($sidebarReleasePath) ? json_decode(file_get_contents($sidebarReleasePath), true) : [];
    @endphp
    <div class="shell-runtime rail-label"><p id="shell-default-status" role="status"><span class="connection-dot" aria-hidden="true"></span>Checking connection…</p><p title="{{ $sidebarRelease['buildId'] ?? '' }}">Website · v{{ $sidebarRelease['version'] ?? 'Unknown' }}</p></div>
    <div class="account"><span class="account-name rail-label">{{ auth()->user()->name }}</span><form method="post" action="{{ route('logout') }}">@csrf<button>Sign out</button></form></div>
</aside><div class="shell-tabbar"><a class="shell-tab-brand" href="{{ route('home') }}" aria-label="Proteus Home"><span aria-hidden="true">⤨</span><span>Proteus</span></a><nav id="shell-tabs" class="shell-tabs" aria-label="Open content tabs"></nav><button id="shell-find" type="button" class="shell-find" aria-label="Find in page" title="Find in page · ⌘F">⌕</button><details id="shell-add-menu" class="shell-add-menu"><summary aria-label="Add tab" title="Add tab">+</summary><div class="shell-add-options"><button type="button" data-shell-create="markdown"><span class="tab-create-icon markdown" aria-hidden="true"></span><span>Markdown file</span></button><button type="button" data-shell-create="browser"><span class="tab-create-icon browser" aria-hidden="true"></span><span>Browser</span></button><button type="button" disabled title="Create terminals on the owning computer"><span class="tab-create-icon terminal" aria-hidden="true"></span><span>Terminal</span></button><button type="button" data-shell-create="chat"><span class="tab-create-icon chat" aria-hidden="true"></span><span>New chat</span></button><button type="button" data-shell-create="internet"><span class="tab-create-icon browser" aria-hidden="true"></span><span>Internet Search</span></button></div></details><input id="shell-file-picker" type="file" accept=".md,.markdown,.html,.htm,text/markdown,text/html,text/plain" hidden></div><div class="shell-workspace"><main id="main-content" class="main" tabindex="-1">@include('partials.messages')@yield('content')</main></div></div>
<script type="application/json" id="shell-sections">@json($sections, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT)</script></body></html>
