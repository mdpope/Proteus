@extends('layouts.app')
@section('title', 'Download Proteus')
@section('content')
<h1>Proteus for Windows</h1>
<p>Install Proteus on a Windows 64-bit PC. The installer adds Proteus to the Start menu; developer tools are not required.</p>
@forelse($releases as $release)
<section class="card">
    <h2>Version {{ $release['version'] }}</h2>
    <p>{{ $release['buildRevision'] }}</p>
    @if(($release['installer']['authenticode'] ?? null) === 'unsigned')
        <p>This initial installer is unsigned. Windows may show an unknown publisher or SmartScreen warning.</p>
    @endif
    <p><a href="{{ route('desktop-releases.download', ['id' => $release['id'], 'kind' => 'installer']) }}">Download Windows installer</a></p>
    <details><summary>Verify or update offline</summary>
        <p>Installer SHA-256: <code>{{ $release['installer']['sha256'] }}</code></p>
        <p>For an offline update, save both files in one folder, then choose the release manifest in Proteus → Engine Room → Updates.</p>
        <a href="{{ route('desktop-releases.download', ['id' => $release['id'], 'kind' => 'manifest']) }}">Signed release manifest</a>
        <a href="{{ route('desktop-releases.download', ['id' => $release['id'], 'kind' => 'artifact']) }}">Offline update archive</a>
    </details>
</section>
@empty
<p>No Windows release has been published yet.</p>
@endforelse
@endsection
