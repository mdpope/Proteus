<?php

namespace App\Services;

use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AppRecords
{
    public const LIMITS = ['preferences' => 1, 'team-lists' => 50, 'links' => 200, 'history' => 500, 'notifications' => 500, 'logs' => 1000, 'push-subscriptions' => 32, 'push-outbox' => 1000];

    public function query(User $user, string $kind): Builder
    {
        return DB::table('app_records')->where('user_id', $user->id)->where('kind', $kind);
    }

    public function decode(object $row): array
    {
        $payload = json_decode(decrypt($row->payload), true, 512, JSON_THROW_ON_ERROR);

        return ['id' => $row->id, 'revision' => (int) $row->revision, 'createdAt' => CarbonImmutable::parse($row->created_at, 'UTC')->toISOString(), 'updatedAt' => CarbonImmutable::parse($row->updated_at, 'UTC')->toISOString()] + $payload;
    }

    public function all(User $user, string $kind): array
    {
        return $this->query($user, $kind)->orderByDesc('updated_at')->orderByDesc('id')->limit(self::LIMITS[$kind])->get()->map(fn (object $row) => $this->decode($row))->all();
    }

    public function preferences(User $user): array
    {
        $stored = $this->all($user, 'preferences')[0] ?? [];

        return array_replace(['defaultMacId' => null, 'timezone' => 'UTC', 'searchEngine' => 'google', 'allowanceDisplay' => 'compact', 'sidebarCollapsed' => false, 'scheduleCompletionNotifications' => false], $stored);
    }

    public function save(User $user, string $kind, array $payload, ?string $id = null, ?int $revision = null): array
    {
        return DB::transaction(function () use ($user, $kind, $payload, $id, $revision) {
            User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            $old = $id ? $this->query($user, $kind)->where('id', $id)->first() : null;
            abort_if($id && ! $old, 404);
            abort_if($old && $revision !== null && (int) $old->revision !== $revision, 409, 'This record changed. Refresh before saving.');
            $id ??= (string) Str::uuid();
            $row = ['id' => $id, 'user_id' => $user->id, 'kind' => $kind, 'revision' => ($old?->revision ?? 0) + 1, 'payload' => encrypt(json_encode($payload, JSON_THROW_ON_ERROR)), 'created_at' => $old?->created_at ?? now()->utc()->format('Y-m-d H:i:s'), 'updated_at' => now()->utc()->format('Y-m-d H:i:s')];
            if ($old) {
                $this->query($user, $kind)->where('id', $id)->update($row);
            } else {
                abort_if(in_array($kind, ['team-lists', 'links', 'push-subscriptions']) && $this->query($user, $kind)->count() >= self::LIMITS[$kind], 422, 'Remove an older record before adding another.');
                DB::table('app_records')->insert($row);
            }
            $expired = $this->query($user, $kind)->orderByDesc('updated_at')->orderByDesc('id')->skip(self::LIMITS[$kind])->take(1000)->pluck('id');
            $this->query($user, $kind)->whereIn('id', $expired)->delete();

            return $this->decode((object) $row);
        });
    }

    public function safeUrl(string $url, bool $history = true): string
    {
        $parts = parse_url($url);
        abort_unless($parts && in_array(strtolower($parts['scheme'] ?? ''), ['http', 'https']) && isset($parts['host']) && ! isset($parts['user'], $parts['pass']), 422, 'Use an http or https URL without credentials.');
        abort_if(isset($parts['user']) || isset($parts['pass']) || preg_match('~(?:oauth|authorize|callback|sign[-_]?in|login|reset|token)(?:/|$)~i', $parts['path'] ?? '') || preg_match('/[\x00-\x20\x7f]/', $url), 422, 'Authentication URLs are not retained.');

        parse_str($parts['query'] ?? '', $query);
        foreach (array_keys($query) as $key) {
            abort_if(preg_match('/(?:token|secret|password|passwd|credential|authorization|api.?key|code|session|signature|sig|pair|pairing)$/i', $key), 422, 'URLs containing authentication parameters are not retained.');
        }

        // Fragment parameters can carry OAuth tokens or a complete pairing capsule.
        $fragment = rawurldecode($parts['fragment'] ?? '');
        abort_if(preg_match('~(?:^|[?&#/])[^=&#/]*(?:token|secret|password|passwd|credential|authorization|api.?key|code|session|signature|sig|pair|pairing|data)=~i', $fragment), 422, 'URLs containing authentication parameters are not retained.');

        return strtolower($parts['scheme']).'://'.strtolower($parts['host']).(isset($parts['port']) ? ':'.$parts['port'] : '').($parts['path'] ?? '/').(! $history && isset($parts['query']) ? '?'.$parts['query'] : '').(! $history && isset($parts['fragment']) ? '#'.$parts['fragment'] : '');
    }
}
