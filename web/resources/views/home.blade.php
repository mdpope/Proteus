@extends('layouts.app')
@section('title','Home')
@section('content')
<section id="proteus-home" class="home-page">
    <header><div class="eyebrow">Welcome</div><h1>Proteus</h1><p>Keep conversations, schedules, team tools, browsing, and personal records together. Your connected Macs run AI work; this website lets you reach that work and your shared records.</p></header>
    <div class="home-cards">
        <section class="card"><h2>Start here</h2><p>Open Chats to work with a connected Mac, Schedules to inspect recurring work, Team Tools for shared lists and standup, or Life for your personal records.</p><p>Proteus loads each area when you visit it.</p></section>
        <section class="card"><h2>Website version</h2><p class="home-version">{{ $version }}@if($buildId) · <span class="home-build-id" title="Full build ID: {{ $buildId }}">{{ preg_match('/\A[a-f0-9]{40}\z/i', $buildId) ? substr($buildId, 0, 12) : $buildId }}</span>@else · development build @endif</p><p>Update availability depends on how this website was installed. This installation does not expose an automatic update check.</p></section>
    </div>
    <details class="card home-release-notes"><summary>What changed · changelog</summary>@if($changelog)<div class="home-release-prose">{!! \Illuminate\Support\Str::markdown($changelog, ['html_input' => 'strip', 'allow_unsafe_links' => false]) !!}</div>@else<p>Release notes were not included with this installation.</p>@endif</details>
    <details class="card home-release-notes"><summary>Future updates</summary>@if($updates)<div class="home-release-prose">{!! \Illuminate\Support\Str::markdown($updates, ['html_input' => 'strip', 'allow_unsafe_links' => false]) !!}</div>@else<p>The planned updates list was not included with this installation.</p>@endif</details>
</section>
@endsection
