@extends('layouts.app')
@section('title','Team Tools')
@section('content')
<section id="team-tools"><header><h1>Team Tools</h1><p>Shared lists and links, with a daily standup order on this device.</p></header><p id="shared-notice" role="status"></p><nav class="remote-tabs"><button data-team-tab="overview">Overview</button><button data-team-tab="standup">Standup</button><a href="{{ route('browser-home') }}" target="_blank" rel="noopener">New browser ↗</a></nav><div id="team-content"></div></section>
@endsection
