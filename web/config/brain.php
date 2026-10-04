<?php

return ['legacy_host' => env('BRAIN_LEGACY_HOST', ''), 'legacy_owner_email' => env('BRAIN_OWNER_EMAIL', ''), 'legacy_key_hashes' => array_filter(explode(',', env('BRAIN_LEGACY_KEY_HASHES', ''))), 'inbound_mail_directory' => env('BRAIN_INBOUND_MAIL_DIRECTORY')];
