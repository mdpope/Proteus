<?php

namespace App\Services;

use Illuminate\Support\Facades\Validator;
use JsonException;
use SodiumException;

class DesktopReleases
{
    /** @return list<array{envelope: array, release: array, directory: string}> */
    public function catalog(string $platform, string $arch, string $channel): array
    {
        $root = realpath(config('desktop_releases.root'));
        if ($root === false) {
            return [];
        }
        $releases = [];
        foreach (array_slice(scandir($root), 0, 500) as $id) {
            $item = $this->find($id);
            if ($item && $item['release']['platform'] === $platform && $item['release']['arch'] === $arch && $item['release']['channel'] === $channel) {
                $releases[] = $item;
            }
        }
        usort($releases, fn (array $a, array $b): int => strcmp($b['release']['publishedAt'], $a['release']['publishedAt']) ?: strcmp($b['release']['id'], $a['release']['id']));

        return array_slice($releases, 0, 50);
    }

    /** @return array{envelope: array, release: array, directory: string}|null */
    public function find(string $id): ?array
    {
        if (! preg_match('/\A[A-Za-z0-9][A-Za-z0-9._-]{0,159}\z/', $id)) {
            return null;
        }
        $root = realpath(config('desktop_releases.root'));
        $directory = $root === false ? false : realpath($root.DIRECTORY_SEPARATOR.$id);
        if ($directory === false || dirname($directory) !== $root || is_link($root.DIRECTORY_SEPARATOR.$id)) {
            return null;
        }
        $file = $directory.DIRECTORY_SEPARATOR.'release.json';
        if (! is_file($file) || is_link($file) || filesize($file) > 131072) {
            return null;
        }
        try {
            $envelope = json_decode(file_get_contents($file), true, 32, JSON_THROW_ON_ERROR);
            if (! is_array($envelope) || ($envelope['schemaVersion'] ?? null) !== 1 || ! is_string($envelope['payload'] ?? null) || strlen($envelope['payload']) > 65536 || ! is_string($envelope['signature'] ?? null) || strlen($envelope['signature']) > 256) {
                return null;
            }
            $key = collect(config('desktop_releases.keys', []))->firstWhere('id', $envelope['keyId'] ?? null);
            if (! $key) {
                return null;
            }
            $der = base64_decode(preg_replace('/-----[^-]+-----|\s+/', '', $key['publicKey']), true);
            if ($der === false || strlen($der) !== 44 || substr($der, 0, 12) !== hex2bin('302a300506032b6570032100')) {
                return null;
            }
            $payload = sodium_base642bin($envelope['payload'], SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
            $signature = sodium_base642bin($envelope['signature'], SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING);
            if (strlen($signature) !== SODIUM_CRYPTO_SIGN_BYTES || ! sodium_crypto_sign_verify_detached($signature, $payload, substr($der, 12))) {
                return null;
            }
            $release = json_decode($payload, true, 32, JSON_THROW_ON_ERROR);
            if (! is_array($release) || ! $this->valid($release, $id)) {
                return null;
            }

            return compact('envelope', 'release', 'directory');
        } catch (JsonException|SodiumException|\ValueError) {
            return null;
        }
    }

    private function valid(array $release, string $id): bool
    {
        $rules = [
            'schemaVersion' => 'required|in:1', 'product' => 'required|in:org.proteusapp.proteus.desktop',
            'id' => 'required|string', 'platform' => 'required|in:win32,darwin,linux', 'arch' => 'required|in:x64,arm64', 'channel' => 'required|in:stable,preview',
            'version' => ['required', 'string', 'regex:/\A\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?\z/'],
            'buildRevision' => 'required|string|max:200', 'sourceFingerprint' => 'required|regex:/\A[a-f0-9]{64}\z/', 'packageHash' => 'required|regex:/\A[a-f0-9]{64}\z/',
            'publishedAt' => 'required|date', 'expiresAt' => 'required|date',
            'artifact' => 'required|array', 'artifact.format' => 'required|in:tar.gz',
            'artifact.filename' => ['required', 'string', 'regex:/\A[A-Za-z0-9][A-Za-z0-9._-]{0,199}\.tar\.gz\z/'],
            'artifact.bytes' => 'required|integer|between:1,2147483648', 'artifact.unpackedBytes' => 'required|integer|between:1,8589934592',
            'artifact.sha256' => 'required|regex:/\A[a-f0-9]{64}\z/', 'artifact.path' => 'required|string',
        ];
        if (($release['platform'] ?? null) === 'win32') {
            $rules += [
                'installer' => 'required|array', 'installer.filename' => ['required', 'string', 'regex:/\A[A-Za-z0-9][A-Za-z0-9._-]{0,199}\.exe\z/'],
                'installer.bytes' => 'required|integer|between:1,2147483648', 'installer.sha256' => 'required|regex:/\A[a-f0-9]{64}\z/', 'installer.path' => 'required|string',
            ];
        }
        if (Validator::make($release, $rules)->fails()) {
            return false;
        }
        $published = strtotime($release['publishedAt']);
        $expires = strtotime($release['expiresAt']);

        return $release['id'] === $id && $published <= now()->timestamp + 300 && $expires > now()->timestamp && $expires > $published && $expires - $published <= 366 * 86400
            && $release['artifact']['path'] === '/api/v1/app/releases/'.$id.'/artifact'
            && ($release['platform'] !== 'win32' || $release['installer']['path'] === '/api/v1/app/releases/'.$id.'/installer');
    }

    /** @return resource|null */
    public function openArtifact(array $item, string $kind): mixed
    {
        if ($kind !== 'artifact' && ! ($kind === 'installer' && $item['release']['platform'] === 'win32')) {
            return null;
        }
        $artifact = $item['release'][$kind] ?? null;
        if (! is_array($artifact)) {
            return null;
        }
        $file = $item['directory'].DIRECTORY_SEPARATOR.$artifact['filename'];
        if (! is_file($file) || is_link($file) || realpath(dirname($file)) !== $item['directory']) {
            return null;
        }
        $handle = fopen($file, 'rb');
        if ($handle === false) {
            return null;
        }
        $hash = hash_init('sha256');
        $bytes = hash_update_stream($hash, $handle);
        if ($bytes !== $artifact['bytes'] || ! hash_equals($artifact['sha256'], hash_final($hash))) {
            fclose($handle);

            return null;
        }
        rewind($handle);

        return $handle;
    }
}
