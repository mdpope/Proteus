<fieldset data-kinds="oil_analysis"><legend>Oil analysis</legend>
<div class="form-grid">
<label>Sample status<select name="data[analysis_status]">
@foreach(['awaiting_mailing'=>'Awaiting mailing','submitted'=>'Submitted to lab','reported'=>'Report received'] as $value=>$label)<option value="{{ $value }}" @selected(($data['analysis_status']??'reported')===$value)>{{ $label }}</option>@endforeach
</select></label>
@foreach(['lab'=>'Laboratory','report_number'=>'Report number','unit_id'=>'Lab unit ID','engine'=>'Engine','oil_type'=>'Oil type / grade as reported','order_number'=>'Order number'] as $key=>$label)
<label>{{ $label }}<input name="data[{{ $key }}]" value="{{ $data[$key]??'' }}" maxlength="200"></label>
@endforeach
@foreach(['sample_date'=>'Sample date','report_date'=>'Report date'] as $key=>$label)<label>{{ $label }}<input type="date" name="data[{{ $key }}]" value="{{ $data[$key]??'' }}"></label>@endforeach
@foreach(['odometer'=>'Odometer · miles','oil_miles'=>'Miles on oil','makeup_quarts'=>'Makeup oil · quarts','comparison_miles'=>'Universal average interval · miles'] as $key=>$label)<label>{{ $label }}<input type="number" min="0" step="0.1" name="data[{{ $key }}]" value="{{ $data[$key]??'' }}"></label>@endforeach
</div>
<label>Lab comments<textarea name="data[lab_comments]" rows="7">{{ $data['lab_comments']??'' }}</textarea></label>
<label>Collection conditions / limitations<textarea name="data[collection_notes]" rows="4">{{ $data['collection_notes']??'' }}</textarea></label>
<details><summary>Lab measurements · {{ count($data['measurements']??[]) }} recorded</summary><p class="muted">Copy values as printed, including &lt;0.5 or TR. Leave untested values blank. Lab averages and reference ranges are context, not diagnoses.</p>
<div id="oil-measurements">
@foreach($data['measurements']??[] as $index=>$measurement)
<div class="oil-measurement form-grid">
@foreach(['name'=>'Test','value'=>'Result','unit'=>'Unit','reference'=>'Lab range / limit','unit_average'=>'Unit average','universal_average'=>'Universal average'] as $key=>$label)<label>{{ $label }}<input name="data[measurements][{{ $index }}][{{ $key }}]" value="{{ $measurement[$key]??'' }}" maxlength="100" @required($key==='name')></label>@endforeach
<button type="button" class="secondary remove-measurement">Remove measurement</button></div>
@endforeach
</div>
<button type="button" class="secondary" id="add-measurement">＋ Add measurement</button>
<template id="oil-measurement-template"><div class="oil-measurement form-grid">
@foreach(['name'=>'Test','value'=>'Result','unit'=>'Unit','reference'=>'Lab range / limit','unit_average'=>'Unit average','universal_average'=>'Universal average'] as $key=>$label)<label>{{ $label }}<input data-field="{{ $key }}" maxlength="100" @required($key==='name')></label>@endforeach
<button type="button" class="secondary remove-measurement">Remove measurement</button></div></template>
</details>
</fieldset>
