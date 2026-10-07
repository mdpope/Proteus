@extends('layouts.app')
@section('title','Home')
@section('content')
<div id="proteus-home"></div>
@php($homeData = ['version'=>$version, 'buildId'=>$buildId, 'readme'=>$readme, 'changelog'=>$changelog])
<script type="application/json" id="proteus-home-data">@json($homeData, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT)</script>
@endsection
