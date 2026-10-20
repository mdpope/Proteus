<?php

return [
    // Public identifier only. Provision using php artisan proteus:native-client.
    'client_id' => env('PROTEUS_NATIVE_CLIENT_ID'),
    'redirect_uri' => 'proteus://life-oauth/callback',
    'desktop_client_id' => env('PROTEUS_DESKTOP_CLIENT_ID'),
    'desktop_redirect_uri' => 'proteus-desktop://life-oauth/callback',
];
