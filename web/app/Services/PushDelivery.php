<?php

namespace App\Services;

use App\Models\User;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

/** Payload-free browser wakeups and APNs alerts with bounded chat text. Secrets stay in configured files. */
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

    public static function obsolete(array $notification): bool
    {
        $created = strtotime($notification['occurredAt'] ?? $notification['createdAt'] ?? '') ?: 0;

        return ($notification['silent'] ?? false) || ($notification['read'] ?? false) || ! empty($notification['readAt']) || ! empty($notification['resolvedAt']) || ($notification !== [] && ($created < time() - 300 || $created > time() + 60));
    }

    /** Shared by immediate Life answers and the retry worker; each recipient has one durable send intent. */
    public function deliverPending(?User $onlyUser = null, ?string $notificationId = null, int $limit = 100): ?int
    {
        $query = DB::table('app_records')->where('kind', 'push-outbox')->orderBy('updated_at');
        if ($onlyUser) {
            $query->where('user_id', $onlyUser->id);
        }
        $rows = $query->limit(AppRecords::LIMITS['push-outbox'])->get();
        if ($onlyUser && $notificationId) {
            $subscriptions = array_column($this->records->all($onlyUser, 'push-subscriptions'), null, 'id');
            $rows = $rows->filter(fn ($row) => $this->records->decode($row)['notificationId'] === $notificationId)
                ->sortBy(fn ($row) => ($subscriptions[$this->records->decode($row)['subscriptionId']]['platform'] ?? '') === 'apns' ? 0 : 1);
        }
        $processed = 0;
        $acceptedAt = null;
        foreach ($rows as $row) {
            if ($processed >= max(1, min(100, $limit))) {
                break;
            }
            $lock = Cache::lock('proteus-push-item-'.$row->id, 120);
            if (! $lock->get()) {
                continue;
            }
            try {
                $user = $onlyUser ?? User::find($row->user_id);
                if (! $user) {
                    continue;
                }
                $current = $this->records->query($user, 'push-outbox')->where('id', $row->id)->first();
                if (! $current) {
                    continue;
                }
                $item = $this->records->decode($current);
                if ($notificationId && $item['notificationId'] !== $notificationId) {
                    continue;
                }
                $subscription = $this->records->query($user, 'push-subscriptions')->where('id', $item['subscriptionId'])->first();
                $notification = $this->records->query($user, 'notifications')->where('id', $item['notificationId'])->first();
                if (! $notification || ! $subscription || self::obsolete($this->records->decode($notification))) {
                    $this->records->query($user, 'push-outbox')->where('id', $row->id)->delete();

                    continue;
                }
                // A timed-out or abandoned sending intent may already have reached APNs.
                if (in_array($item['state'] ?? '', ['sending', 'uncertain', 'failed'])) {
                    DB::table('app_records')->where('id', $row->id)->update(['updated_at' => now()->utc()->format('Y-m-d H:i:s')]);

                    continue;
                }
                $processed++;
                $intent = ['subscriptionId' => $item['subscriptionId'], 'notificationId' => $item['notificationId'], 'attempts' => $item['attempts'], 'state' => 'sending'];
                $this->records->save($user, 'push-outbox', $intent, $row->id);
                $target = $this->records->decode($subscription);
                $result = $this->deliver($target, $this->records->decode($notification));
                if ($result === 'unavailable') {
                    $this->records->save($user, 'push-outbox', array_replace($intent, ['state' => 'pending']), $row->id);

                    continue;
                }
                if ($result === 'accepted' && $target['platform'] === 'apns') {
                    $acceptedAt = (int) floor(microtime(true) * 1000);
                    DB::transaction(function () use ($user, $notification, $acceptedAt) {
                        User::whereKey($user->id)->lockForUpdate()->firstOrFail();
                        $fresh = $this->records->query($user, 'notifications')->where('id', $notification->id)->first();
                        if (! $fresh) {
                            return;
                        }
                        $payload = $this->records->decode($fresh);
                        unset($payload['id'], $payload['revision'], $payload['createdAt'], $payload['updatedAt']);
                        $payload['pushAcceptedAt'] ??= $acceptedAt;
                        $this->records->save($user, 'notifications', $payload, $notification->id);
                    });
                }
                if (in_array($result, ['accepted', 'expired', 'obsolete']) || $item['attempts'] >= 4) {
                    $this->records->query($user, 'push-outbox')->where('id', $row->id)->delete();
                    if ($result === 'expired') {
                        $this->records->query($user, 'push-subscriptions')->where('id', $subscription->id)->delete();
                    }
                } else {
                    $this->records->save($user, 'push-outbox', ['subscriptionId' => $item['subscriptionId'], 'notificationId' => $item['notificationId'], 'attempts' => $item['attempts'] + 1, 'state' => $result === 'failed' ? 'rejected' : $result], $row->id);
                }
                if (in_array($result, ['failed', 'uncertain'])) {
                    $this->records->save($user, 'logs', ['code' => 'push_failed', 'event' => 'push_failed', 'level' => 'warning', 'source' => 'server', 'message' => $result === 'uncertain' ? 'Push delivery is uncertain; automatic redelivery is held to avoid duplicate alerts.' : 'Push provider rejected a notification.']);
                }
            } finally {
                $lock->release();
            }
        }

        return $acceptedAt;
    }

    /** Provider acceptance is not device delivery; uncertain sends must not be replayed automatically. */
    public function deliver(array $subscription, array $notification = []): string
    {
        if (self::obsolete($notification)) {
            return 'obsolete';
        }
        $created = strtotime($notification['occurredAt'] ?? $notification['createdAt'] ?? '') ?: 0;
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
                // Operator decision (Oct 27): alerts show the chat title, a bounded
                // plain-text preview and the source computer. Transport stays HTTPS to
                // APNs; Apple can read alert text. Older desktops send no preview fields.
                $route = array_intersect_key($notification, array_flip(['hostId', 'chatId', 'scheduleId', 'type', 'requestId', 'requestKind']));
                if (isset($notification['destination'])) {
                    $route['destination'] = $notification['destination'];
                }
                if ($created > 0) {
                    $route['createdAt'] = gmdate('Y-m-d\TH:i:s\Z', $created);
                }
                $eventId = $notification['eventId'] ?? $notification['id'] ?? null;
                $clean = fn ($value, $limit) => is_string($value) ? mb_substr(trim(preg_replace('/[\x00-\x1f\x7f]+/u', ' ', $value)), 0, $limit) : '';
                $title = $clean($notification['title'] ?? '', 160);
                $computer = $clean($notification['hostName'] ?? '', 80);
                $body = $clean($notification['body'] ?? '', 500);
                $alert = ['title' => $title !== '' ? $title : 'Proteus', 'body' => $body !== '' ? $body : 'There is an update in Proteus. Open Notifications to review.'];
                if ($computer !== '') {
                    $alert['subtitle'] = $computer;
                }
                $aps = ['alert' => $alert, 'thread-id' => $route['chatId'] ?? 'proteus'];
                if (($notification['sound'] ?? true) !== false) {
                    $aps['sound'] = 'default';
                }
                $payload = ['aps' => $aps];
                if (is_string($eventId)) {
                    $route['notificationId'] = $eventId;
                }
                $headers = ['apns-topic' => config('push.apns_topic'), 'apns-push-type' => 'alert', 'apns-priority' => '10', 'apns-expiration' => (string) ($created > 0 ? $created + 300 : time() + 300)];
                if (is_string($eventId)) {
                    $headers['apns-collapse-id'] = hash('sha256', $eventId);
                    $headers['apns-id'] = $eventId;
                }
                $response = $http->withOptions(['version' => 2.0])->withToken($token)->withHeaders($headers)->post('https://'.$host.'/3/device/'.$subscription['token'], $payload + $route);
            }

            return $response->successful() ? 'accepted' : (in_array($response->status(), [404, 410]) ? 'expired' : 'failed');
        } catch (\Throwable) {
            return 'uncertain';
        }
    }
}
