
@extends('layouts.app')
@section('title','Inbox')
@section('content')<header class="top"><div><div class="eyebrow">Nothing lost in the shuffle</div><h1>Your inbox</h1><p>Original receipts and photos, with a place to resolve the uncertain bits.</p></div><a class="button" href="{{ route('captures.create') }}">＋ Capture</a></header><section class="card">
@forelse($captures as $capture)<a class="row item file" href="{{ route('captures.show',$capture) }}"><div><h3>{{ $capture->title }}</h3><small>{{ $capture->vehicle?->name ?? 'Vehicle unassigned' }} · {{ $capture->created_at->format('M j, Y') }} · {{ $capture->attachments_count }} files</small></div><span class="pill {{ $capture->status==='review'?'review':'' }}">{{ $capture->status==='review'?'Needs review':'Saved' }}</span></a>
@empty<div class="empty"><h2>Room for the next receipt.</h2><p>Upload a photo or PDF, or enter the details directly.</p></div>
@endforelse{{ $captures->links() }}</section>
@endsection
