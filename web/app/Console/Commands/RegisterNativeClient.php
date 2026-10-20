<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Laravel\Passport\ClientRepository;

class RegisterNativeClient extends Command
{
    protected $signature = 'proteus:native-client {--desktop : Provision the separate desktop callback client}';

    protected $description = 'Provision the public PKCE client for the Proteus iPhone/iPad Life app';

    public function handle(ClientRepository $clients): int
    {
        $desktop = (bool) $this->option('desktop');
        $id = config($desktop ? 'native.desktop_client_id' : 'native.client_id');
        $redirect = config($desktop ? 'native.desktop_redirect_uri' : 'native.redirect_uri');
        if ($id) {
            $client = $clients->findActive($id);
            if (! $client || $client->confidential() || $client->redirect_uris !== [$redirect]
                || ! $client->hasGrantType('authorization_code') || ! $client->hasGrantType('refresh_token')) {
                $this->error('Configured native client is invalid. Review it before creating a replacement.');

                return self::FAILURE;
            }
        } else {
            $client = $clients->createAuthorizationCodeGrantClient($desktop ? 'Proteus Desktop' : 'Proteus iPhone and iPad', [$redirect], false);
        }
        $this->line(($desktop ? 'PROTEUS_DESKTOP_CLIENT_ID=' : 'PROTEUS_NATIVE_CLIENT_ID=').$client->id);
        $this->info('Save this public identifier in server configuration and refresh its config cache. No client secret or account authorization was created.');

        return self::SUCCESS;
    }
}
