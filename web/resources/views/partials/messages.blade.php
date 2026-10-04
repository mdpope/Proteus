
@if(session('status'))<div class="banner" role="status">{{ session('status') }}</div>
@endif
@if($errors->any())<div class="banner error" role="alert">
@foreach($errors->all() as $error)<div>{{ $error }}</div>
@endforeach</div>
@endif
<div id="client-status" class="banner error" role="alert" hidden></div>
