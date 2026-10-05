<?php

return [
    'web_public_key' => env('PROTEUS_WEB_PUSH_PUBLIC_KEY'),
    'web_private_key_path' => env('PROTEUS_WEB_PUSH_PRIVATE_KEY_PATH'),
    'web_subject' => env('PROTEUS_WEB_PUSH_SUBJECT'),
    'web_allowed_hosts' => ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'],
    'apns_key_path' => env('PROTEUS_APNS_KEY_PATH'),
    'apns_key_id' => env('PROTEUS_APNS_KEY_ID'),
    'apns_team_id' => env('PROTEUS_APNS_TEAM_ID'),
    'apns_topic' => env('PROTEUS_APNS_TOPIC'),
];
