<?php
return [
    // Public identifier only. Provision using php artisan proteus:native-client.
    'client_id' => env('PROTEUS_NATIVE_CLIENT_ID'),
    'redirect_uri' => 'proteus://life-oauth/callback',
];
