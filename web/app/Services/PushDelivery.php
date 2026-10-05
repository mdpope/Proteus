<?php

namespace App\Services;

use App\Models\User;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Http;

/** Payload-free browser wakeups and generic APNs alerts. Secrets stay in configured files. */
class PushDelivery
{
    public function __construct(private AppRecords $records) {}

    public function status(): array
    {
        return ['web' => (bool) (config('push.web_public_key') && config('push.web_private_key_path') && config('push.web_subject')), 'apns' => (bool) (config('push.apns_key_path') && config('push.apns_key_id') && config('push.apns_team_id') && config('push.apns_topic')), 'publicKey' => config('push.web_public_key'), 'workerRequired' => true];
    }

    public function validateEndpoint(string $endpoint): void
    {
        $parts = parse_url($endpoint);
        abort_unless($parts && ($parts['scheme'] ?? '') === 'https' && in_array($parts['host'] ?? '', config('push.web_allowed_hosts'), true) && ! isset($parts['port']) && ! isset($parts['user']) && ! isset($parts['pass']) && ! isset($parts['fragment']), 422, 'Unsupported browser push service.');
    }

    public function enqueue(User $user, array $notification): void
    {
        foreach ($this->records->all($user, 'push-subscriptions') as $subscription) {
            $this->records->save($user, 'push-outbox', ['subscriptionId' => $subscription['id'], 'notificationId' => $notification['id'], 'attempts' => 0, 'state' => 'pending']);
        }
    }

    /** Returns accepted, expired, unavailable, or failed; provider acceptance is not device delivery. */
    public function deliver(array $subscription): string
    {
        $platform = $subscription['platform'];
        if (! ($this->status()[$platform] ?? false)) {
            return 'unavailable';
        }
        try {
            $path = config($platform === 'web' ? 'push.web_private_key_path' : 'push.apns_key_path');
            if (! is_string($path) || ! is_readable($path)) {
                return 'unavailable';
            }
            $key = file_get_contents($path);
            $http = Http::connectTimeout(5)->timeout(10)->withoutRedirecting();
            if ($platform === 'web') {
                $this->validateEndpoint($subscription['endpoint']);
                $audience = 'https://'.parse_url($subscription['endpoint'], PHP_URL_HOST);
                $token = JWT::encode(['aud' => $audience, 'exp' => time() + 3600, 'sub' => config('push.web_subject')], $key, 'ES256');
                $response = $http->withHeaders(['Authorization' => 'vapid t='.$token.', k='.config('push.web_public_key'), 'TTL' => '300', 'Urgency' => 'normal', 'Content-Length' => '0'])->withBody('', 'application/octet-stream')->post($subscription['endpoint']);
            } else {
                $token = JWT::encode(['iss' => config('push.apns_team_id'), 'iat' => time()], $key, 'ES256', config('push.apns_key_id'));
                $host = $subscription['environment'] === 'sandbox' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com';
                $response = $http->withOptions(['version' => 2.0])->withToken($token)->withHeaders(['apns-topic' => config('push.apns_topic'), 'apns-push-type' => 'alert', 'apns-expiration' => (string) (time() + 300)])->post('https://'.$host.'/3/device/'.$subscription['token'], ['aps' => ['alert' => ['title' => 'Proteus', 'body' => 'There is an update in Proteus. Open Notifications to review.'], 'sound' => 'default']]);
            }

            return $response->successful() ? 'accepted' : (in_array($response->status(), [404, 410]) ? 'expired' : 'failed');
        } catch (\Throwable) {
            return 'failed';
        }
    }
}
