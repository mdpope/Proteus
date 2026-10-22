<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Passport\Passport;
use PHPUnit\Framework\Attributes\DataProvider;
use Symfony\Component\Process\Process;
use Tests\CreatesBrain;
use Tests\TestCase;

class DesktopReleaseTest extends TestCase
{
    use CreatesBrain, LazilyRefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $key = openssl_pkey_new(['private_key_bits' => 2048]);
        openssl_pkey_export($key, $private);
        config(['app.key' => 'base64:'.base64_encode(str_repeat('t', 32)), 'passport.private_key' => $private, 'passport.public_key' => openssl_pkey_get_details($key)['key']]);
    }

    private function fixture(array $changes = []): array
    {
        $this->travelTo(now()->setDate(2026, 10, 22)->startOfDay());
        Storage::fake('desktop-release-tests');
        $disk = Storage::disk('desktop-release-tests');
        $pair = sodium_crypto_sign_keypair();
        $pem = "-----BEGIN PUBLIC KEY-----\n".base64_encode(hex2bin('302a300506032b6570032100').sodium_crypto_sign_publickey($pair))."\n-----END PUBLIC KEY-----\n";
        config(['desktop_releases.root' => $disk->path(''), 'desktop_releases.keys' => [['id' => 'fixture', 'publicKey' => $pem]]]);
        $release = array_replace_recursive([
            'schemaVersion' => 1, 'product' => 'org.proteusapp.proteus.desktop', 'id' => 'synthetic-release',
            'version' => '1.2.3', 'buildRevision' => 'windows.synthetic', 'platform' => 'win32', 'arch' => 'x64', 'channel' => 'stable',
            'sourceFingerprint' => str_repeat('a', 64), 'packageHash' => str_repeat('b', 64),
            'publishedAt' => '2026-10-21T00:00:00Z', 'expiresAt' => '2026-11-21T00:00:00Z',
            'artifact' => ['format' => 'tar.gz', 'filename' => 'synthetic.tar.gz', 'bytes' => 7, 'unpackedBytes' => 100, 'sha256' => hash('sha256', 'ARCHIVE'), 'path' => '/api/v1/app/releases/synthetic-release/artifact'],
            'installer' => ['filename' => 'synthetic-setup.exe', 'bytes' => 9, 'sha256' => hash('sha256', 'INSTALLER'), 'path' => '/api/v1/app/releases/synthetic-release/installer', 'authenticode' => 'unsigned'],
        ], $changes);
        $payload = json_encode($release, JSON_THROW_ON_ERROR);
        $envelope = ['schemaVersion' => 1, 'keyId' => 'fixture', 'payload' => sodium_bin2base64($payload, SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING), 'signature' => sodium_bin2base64(sodium_crypto_sign_detached($payload, sodium_crypto_sign_secretkey($pair)), SODIUM_BASE64_VARIANT_URLSAFE_NO_PADDING)];
        $disk->put('synthetic-release/release.json', json_encode($envelope));
        $disk->put('synthetic-release/synthetic.tar.gz', 'ARCHIVE');
        $disk->put('synthetic-release/synthetic-setup.exe', 'INSTALLER');

        return $envelope;
    }

    public function test_requires_authentication_and_app_read_scope(): void
    {
        $this->fixture();
        $this->getJson('/api/v1/app/releases?platform=win32&arch=x64')->assertUnauthorized();
        $this->getJson('/api/v1/app/releases/synthetic-release/installer')->assertUnauthorized();
        Passport::actingAs($this->owner(), ['brain:read', 'brain:write']);
        $this->getJson('/api/v1/app/releases?platform=win32&arch=x64')->assertForbidden();
        $this->getJson('/api/v1/app/releases/synthetic-release/artifact')->assertForbidden();
    }

    public function test_lists_signed_matching_releases_and_downloads_exact_verified_bytes(): void
    {
        $envelope = $this->fixture();
        Passport::actingAs($this->owner(), ['app:read']);

        $this->getJson('/api/v1/app/releases?platform=win32&arch=x64')->assertOk()->assertJsonPath('releases', [$envelope])->assertHeader('Cache-Control', 'no-store, private');
        $this->getJson('/api/v1/app/releases?platform=win32&arch=arm64')->assertJsonPath('releases', []);
        $this->getJson('/api/v1/app/releases?platform=win32&arch=x64&channel=preview')->assertJsonPath('releases', []);
        $this->get('/api/v1/app/releases/synthetic-release/artifact')->assertOk()->assertDownload('synthetic.tar.gz')->assertStreamedContent('ARCHIVE')->assertHeader('Content-Length', '7');
        $this->get('/api/v1/app/releases/synthetic-release/installer')->assertDownload('synthetic-setup.exe')->assertStreamedContent('INSTALLER');
        $this->getJson('/api/v1/app/releases/synthetic-release/manifest')->assertExactJson($envelope)->assertDownload('release.json');
    }

    public function test_browser_downloads_require_strong_sign_in_and_report_unsigned_installer(): void
    {
        $this->fixture();
        $this->withoutVite();
        $this->get('/downloads')->assertRedirectToRoute('login');
        $owner = $this->owner();
        $this->actingAs($owner, 'web')->get('/downloads')->assertRedirectToRoute('security');
        $this->signedIn($owner)->get('/downloads')->assertSee('Download Windows installer')->assertSee('This initial installer is unsigned.');
        $this->get('/downloads/synthetic-release/installer')->assertDownload('synthetic-setup.exe')->assertStreamedContent('INSTALLER');
    }

    public static function invalidManifests(): array
    {
        return [
            'expired' => [['expiresAt' => '2026-10-20T00:00:00Z']],
            'future' => [['publishedAt' => '2026-10-23T00:00:00Z']],
            'product' => [['product' => 'another.app']],
            'identity' => [['id' => 'other-release']],
            'archive path' => [['artifact' => ['filename' => '../outside.tar.gz']]],
            'installer path' => [['installer' => ['filename' => '../outside.exe']]],
            'external url' => [['artifact' => ['path' => 'https://other.example/secret']]],
            'oversized' => [['artifact' => ['bytes' => 2147483649]]],
            'unsafe version' => [['version' => '<script>test</script>']],
        ];
    }

    #[DataProvider('invalidManifests')]
    public function test_hides_invalid_signed_manifest_and_returns_404_for_download(array $changes): void
    {
        $this->fixture($changes);
        Passport::actingAs($this->owner(), ['app:read']);

        $this->getJson('/api/v1/app/releases?platform=win32&arch=x64')->assertJsonPath('releases', []);
        $this->get('/api/v1/app/releases/synthetic-release/installer')->assertNotFound();
    }

    public function test_returns_404_for_corrupt_or_missing_files_and_untrusted_manifests(): void
    {
        $envelope = $this->fixture();
        Passport::actingAs($this->owner(), ['app:read']);
        $disk = Storage::disk('desktop-release-tests');
        $disk->put('synthetic-release/synthetic-setup.exe', 'CORRUPTED');
        $this->get('/api/v1/app/releases/synthetic-release/installer')->assertNotFound();
        $disk->delete('synthetic-release/synthetic.tar.gz');
        $this->get('/api/v1/app/releases/synthetic-release/artifact')->assertNotFound();
        $envelope['keyId'] = 'untrusted';
        $disk->put('synthetic-release/release.json', json_encode($envelope));
        $this->getJson('/api/v1/app/releases?platform=win32&arch=x64')->assertJsonPath('releases', []);
        $envelope['keyId'] = 'fixture';
        $envelope['signature'] = str_repeat('A', 86);
        $disk->put('synthetic-release/release.json', json_encode($envelope));
        $this->get('/api/v1/app/releases/synthetic-release/manifest')->assertNotFound();
    }

    public function test_returns_422_for_invalid_filters_and_404_for_paths_outside_catalog(): void
    {
        $this->fixture();
        Passport::actingAs($this->owner(), ['app:read']);

        $this->getJson('/api/v1/app/releases?platform=unknown&arch=x64')->assertUnprocessable()->assertJsonValidationErrors('platform');
        $this->get('/api/v1/app/releases/synthetic-release/release.json')->assertNotFound();
        $this->get('/api/v1/app/releases/..%2Foutside/installer')->assertNotFound();
    }

    public function test_returns_404_for_artifact_symlink_even_when_hash_matches(): void
    {
        $this->fixture();
        Passport::actingAs($this->owner(), ['app:read']);
        $disk = Storage::disk('desktop-release-tests');
        $disk->put('outside.exe', 'INSTALLER');
        $disk->delete('synthetic-release/synthetic-setup.exe');
        if (PHP_OS_FAMILY === 'Windows') {
            // PHP does not request Windows' unprivileged symlink flag; Node does.
            (new Process(['node', '-e', 'require("node:fs").symlinkSync(process.argv[1],process.argv[2]);', $disk->path('outside.exe'), $disk->path('synthetic-release/synthetic-setup.exe')]))->mustRun();
        } else {
            symlink($disk->path('outside.exe'), $disk->path('synthetic-release/synthetic-setup.exe'));
        }

        $this->get('/api/v1/app/releases/synthetic-release/installer')->assertNotFound();
    }
}
