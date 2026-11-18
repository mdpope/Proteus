@foreach(config('life-navigation') as $lifeItem)
    <a href="{{ route($lifeItem['route']) }}" @if(request()->routeIs($lifeItem['route'])) aria-current="page" @endif>{{ $lifeItem['label'] }}</a>
@endforeach
