<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Laravel\Passport\ClientRepository;

class RegisterNativeClient extends Command
{
    protected $signature = 'proteus:native-client';
    protected $description = 'Provision the public PKCE client for the Proteus iPhone/iPad Life app';

    public function handle(ClientRepository $clients): int
    {
        $id = config('native.client_id');
        if ($id) {
            $client = $clients->findActive($id);
            if (! $client || $client->confidential() || $client->redirect_uris !== [config('native.redirect_uri')]
                || ! $client->hasGrantType('authorization_code') || ! $client->hasGrantType('refresh_token')) {
                $this->error('Configured native client is invalid. Review it before creating a replacement.');
                return self::FAILURE;
            }
        } else {
            $client = $clients->createAuthorizationCodeGrantClient('Proteus iPhone and iPad', [config('native.redirect_uri')], false);
        }
        $this->line('PROTEUS_NATIVE_CLIENT_ID='.$client->id);
        $this->info('Save this public identifier in server configuration and refresh its config cache. No client secret or account authorization was created.');
        return self::SUCCESS;
    }
}
