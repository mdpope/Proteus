
@extends('layouts.app')
@section('title',$capture?->title ?? 'Add a record')
@section('content')
@php($saved=$capture?->status==='saved')
@php($data=old('data',$capture?->payload ?? []))
<header class="top"><div><div class="eyebrow"><a href="{{ route('captures.index') }}">← Inbox</a></div><h1>{{ $capture ? ($saved ? 'Saved record' : 'Review this record') : 'Capture the details' }}</h1><p>Keep the original. Add what you know. Leave uncertainty for review.</p></div>
@if($capture)<span class="pill {{ $saved?'':'review' }}">{{ $saved?'Saved':'Needs review' }}</span>
@endif</header>
@if($capture?->uncertainties)<div class="banner">
@foreach($capture->uncertainties as $issue)<div>{{ $issue }}</div>
@endforeach</div>
@endif
<div class="grid"><section class="card"><form method="post" enctype="multipart/form-data" action="{{ $capture ? route('captures.accept',$capture) : route('captures.store') }}">
@csrf
<input type="hidden" name="idempotency_key" value="{{ old('idempotency_key',$capture?->idempotency_key ?? (string)\Illuminate\Support\Str::uuid()) }}">
<fieldset @disabled($saved && $capture?->kind !== 'oil_analysis')><div class="form-grid"><label>Record type<select id="capture-kind" name="kind">
@foreach(['receipt'=>'Part or repair receipt','service'=>'Completed maintenance','fuel'=>'Fuel fill-up','odometer'=>'Odometer reading','oil_analysis'=>'Oil analysis','document'=>'Other document'] as $key=>$label)<option value="{{ $key }}" @selected(old('kind',$capture?->kind ?? request('kind','receipt'))===$key)>{{ $label }}</option>
@endforeach</select></label><label>Vehicle<select name="vehicle_id"><option value="">Choose vehicle</option>
@foreach($vehicles as $vehicle)<option value="{{ $vehicle->id }}" @selected((string)old('vehicle_id',$capture?->vehicle_id ?? request('vehicle'))===(string)$vehicle->id)>{{ $vehicle->name }}</option>
@endforeach</select></label><label class="wide">Title<input name="title" value="{{ old('title',$capture?->title) }}" placeholder="Oil change, fuel stop, or part purchase" required maxlength="200"></label></div>
<fieldset data-kinds="receipt,service"><legend>Work or purchase</legend><div class="form-grid"><label>Date<input name="data[occurred_on]" type="date" value="{{ $data['occurred_on']??'' }}"></label><label>Date precision<select name="data[date_precision]">
@foreach(['day'=>'Exact day','month'=>'Month only (choose first day)','year'=>'Year only (choose Jan 1)','unknown'=>'Unknown'] as $value=>$label)<option value="{{ $value }}" @selected(($data['date_precision']??'day')===$value)>{{ $label }}</option>
@endforeach</select></label><label>Odometer · miles<input name="data[odometer]" type="number" step="0.1" min="0" value="{{ $data['odometer']??'' }}"></label><label>Total cost · USD<input name="data[cost]" type="number" step="0.01" min="0" value="{{ $data['cost']??'' }}"></label><label class="wide">Vendor or shop<input name="data[vendor]" value="{{ $data['vendor']??'' }}"></label></div><p class="notice">A receipt records a purchase. Use completed maintenance only when the work or installation is confirmed.</p></fieldset>
<fieldset data-kinds="fuel"><legend>At the pump</legend><div class="form-grid"><label>Date and time<input name="data[filled_at]" type="datetime-local" value="{{ isset($data['filled_at']) ? str_replace(' ','T',substr($data['filled_at'],0,16)) : '' }}"></label><label>Odometer · miles<input name="data[odometer]" type="number" step="0.1" min="0" value="{{ $data['odometer']??'' }}"></label><label>US gallons<input name="data[gallons]" type="number" step="0.001" min="0.001" value="{{ $data['gallons']??'' }}"></label><label>Price per gallon · USD<input name="data[price_per_gallon]" type="number" step="0.001" min="0.001" value="{{ $data['price_per_gallon']??'' }}"></label><label>Total · USD<input name="data[total_cost]" type="number" step="0.01" min="0" value="{{ $data['total_cost']??'' }}"></label><label>Fuel<select name="data[fuel_type]">
@foreach(['gas','diesel','other'] as $type)<option @selected(($data['fuel_type']??'gas')===$type)>{{ $type }}</option>
@endforeach</select></label><label>Trip distance · miles<input name="data[trip_miles]" type="number" step="0.1" value="{{ $data['trip_miles']??'' }}"></label><label>Dashboard MPG · optional<input name="data[dashboard_mpg]" type="number" step="0.1" value="{{ $data['dashboard_mpg']??'' }}"></label><label>Fill level<select name="data[full_tank]"><option value="1" @selected(($data['full_tank']??true)==true)>Filled to full</option><option value="0" @selected(($data['full_tank']??true)==false)>Partial fill</option></select></label><label>Missing any fill-ups?<select name="data[missed_fill]"><option value="0">No</option><option value="1" @selected($data['missed_fill']??false)>Yes — start a new interval</option></select></label><label class="wide">Station<input name="data[station]" value="{{ $data['station']??'' }}"></label></div></fieldset>
<fieldset data-kinds="odometer"><legend>Odometer observation</legend><div class="form-grid"><label>Date<input name="data[observed_on]" type="date" value="{{ $data['observed_on']??'' }}"></label><label>Odometer · miles<input name="data[miles]" type="number" step="0.1" value="{{ $data['miles']??'' }}"></label></div></fieldset>
@include('captures.oil-analysis')
<label>Notes<textarea name="notes">{{ old('notes',$capture?->notes) }}</textarea></label>
@if(!$capture || $capture->kind==='oil_analysis')<label class="section">Photos, PDF receipts, or email files<input name="files[]" type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf,.eml,message/rfc822"></label><small>Up to 12 files, 20 MB each. Originals are private.</small>
@endif
@if(!$capture)<label class="section">Save preference<select name="clear_match"><option value="0">Save to inbox for review</option><option value="1" @selected(old('clear_match')==='1')>I checked these details — save if complete</option></select></label>
@endif
@if(!$saved || $capture?->kind==='oil_analysis')<div class="actions"><button>{{ $saved?'Save changes':($capture?'Confirm & save record':'Save record') }}</button></div>
@endif</fieldset></form></section><aside class="stack"><div class="card"><h2>Original evidence</h2>
@if($capture)
@forelse($capture->attachments as $attachment)<a class="file" href="{{ route('attachments.download',$attachment) }}" @if($attachment->mime_type==='application/pdf') target="_blank" rel="noopener noreferrer" @endif>↗ {{ $attachment->original_name }}<br><small>{{ number_format($attachment->bytes/1024) }} KB · {{ $attachment->mime_type==='application/pdf' ? 'PDF opens in a new tab' : 'Original file' }}</small></a>
@empty<p class="muted">No files attached.</p>
@endforelse 
@else<p class="muted">For fill-ups, add the pump photo and the dashboard photo together. For a repair, keep the invoice and any part labels.</p>
@endif</div><div class="card"><h2>Clear matches save. Questions wait.</h2><p class="muted">ChatGPT can read photos and submit their details. Uploading an image here preserves it in your inbox; check or enter the extracted values before saving to history.</p><p class="muted">Price mismatches, missing fields, and conflicting odometer readings stay in review.</p></div>
@if(!empty($data['parts']))<div class="card"><h2>Parts</h2>
@foreach($data['parts'] as $part)<p>{{ $part['name'] }} · {{ $part['part_number']??'' }} 
@if(isset($part['cost'])) · ${{ number_format($part['cost'],2) }}
@endif</p>
@endforeach</div>
@endif</aside></div>
@endsection
