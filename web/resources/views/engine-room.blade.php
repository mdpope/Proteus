@extends('layouts.app')
@section('title','Engine Room')
@section('content')
<section id="engine-room"><h1>Engine Room</h1><p id="shared-notice" role="status"></p><nav class="remote-tabs" aria-label="Engine Room"><button data-engine-tab="resources">Resources</button><button data-engine-tab="connections">Connections</button><a href="{{ route('security') }}">Account &amp; Security</a><button data-engine-tab="setup">App Setup</button><button data-engine-tab="usage">Usage</button><button data-engine-tab="notifications">Notifications</button><button data-engine-tab="logs">Logs</button></nav><div id="engine-content"></div></section>
@endsection
