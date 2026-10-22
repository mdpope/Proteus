<?php

return [
    'root' => env('PROTEUS_DESKTOP_RELEASE_ROOT', storage_path('app/private/desktop-releases')),
    'keys' => json_decode(file_get_contents(resource_path('desktop-release-keys.json')), true)['keys'],
];
