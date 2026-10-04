<section class="card oil-analysis-section" id="oil-analysis">
<div class="row"><div><h2>Oil analysis</h2><p class="muted">Samples, lab results, and original reports for this vehicle.</p></div><a class="button secondary" href="{{ route('captures.create',['vehicle'=>$vehicle->id,'kind'=>'oil_analysis']) }}">＋ Add sample / report</a></div>
@forelse($oilAnalyses as $analysis)
@php($oil=$analysis->payload)
<article class="item"><div class="row"><h3><a href="{{ route('captures.show',$analysis) }}">{{ $analysis->title }}</a></h3><span class="pill {{ $analysis->status==='review'?'review':'' }}">{{ $analysis->status==='review'?'Needs review':(['awaiting_mailing'=>'Awaiting mailing','submitted'=>'Submitted to lab','reported'=>'Report received'][$oil['analysis_status']??'']??'Incomplete') }}</span></div>
<p><strong>Sample {{ $oil['sample_date']??'Date unknown' }}</strong>@if(!empty($oil['report_date'])) · Report {{ $oil['report_date'] }}@endif · {{ $oil['lab']??'Lab unknown' }} {{ $oil['report_number']??'' }}</p>
<p class="muted">{{ $oil['oil_type']??'Oil not recorded' }}@if(isset($oil['odometer'])) · {{ number_format($oil['odometer']) }} odometer mi @endif @if(isset($oil['oil_miles'])) · {{ number_format($oil['oil_miles']) }} mi on oil @endif</p>
@if(!empty($oil['collection_notes']))<p class="notice"><strong>Collection notes:</strong> {{ $oil['collection_notes'] }}</p>@endif
@if(!empty($oil['lab_comments']))<p>{{ $oil['lab_comments'] }}</p>@endif
@if(!empty($oil['measurements']))<details><summary>Lab measurements ({{ count($oil['measurements']) }})</summary><div class="table-wrap"><table><thead><tr><th>Test</th><th>Result</th><th>Unit</th><th>Lab range / limit</th><th>Unit avg.</th><th>Universal avg.</th></tr></thead><tbody>
@foreach($oil['measurements'] as $measurement)<tr>@foreach(['name','value','unit','reference','unit_average','universal_average'] as $key)<td>{{ $measurement[$key]??'—' }}</td>@endforeach</tr>@endforeach
</tbody></table></div><small>Values preserved as reported; blank means not recorded.@if(isset($oil['comparison_miles'])) Universal averages represent approximately {{ number_format($oil['comparison_miles']) }} miles on oil.@endif</small></details>@endif
<div class="actions">@foreach($analysis->attachments as $attachment)<a href="{{ route('attachments.download',$attachment) }}" @if($attachment->mime_type==='application/pdf') target="_blank" rel="noopener noreferrer" @endif>{{ $attachment->mime_type==='application/pdf'?'↗ PDF':'↓ File' }} · {{ $attachment->original_name }}</a>@endforeach</div>
<p><a href="{{ route('captures.show',$analysis) }}">View / update sample and attachments →</a></p></article>
@empty<p class="muted">No oil samples recorded yet.</p>@endforelse
{{ $oilAnalyses->fragment('oil-analysis')->links() }}
</section>
