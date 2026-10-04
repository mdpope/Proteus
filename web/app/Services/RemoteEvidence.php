<?php

namespace App\Services;

use App\Models\Attachment;
use App\Models\Capture;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class RemoteEvidence
{
    /** Download only short-lived ChatGPT file URLs; pin a public address and forbid redirects. */
    public function attach(Capture $capture, array $files): void
    {
        foreach ($files as $file) {
            $url = $file['download_url'];
            $parts = parse_url($url);
            $host = strtolower($parts['host'] ?? '');
            if (($parts['scheme'] ?? null) !== 'https' || isset($parts['user']) || isset($parts['pass']) || isset($parts['fragment']) || (isset($parts['port']) && $parts['port'] !== 443) || ! ($host === 'oaiusercontent.com' || str_ends_with($host, '.oaiusercontent.com'))) {
                throw ValidationException::withMessages(['files' => 'The file URL must be a temporary HTTPS ChatGPT file address.']);
            }
            $addresses = gethostbynamel($host) ?: [];
            if (! $addresses || collect($addresses)->contains(fn ($ip) => ! filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE))) {
                throw ValidationException::withMessages(['files' => 'File address did not resolve to a public host.']);
            }
            $tmp = tempnam(sys_get_temp_dir(), 'brain-evidence-');
            $handle = fopen($tmp, 'wb');
            $bytes = 0;
            $tooLarge = false;
            try {
                $curl = curl_init($url);
                curl_setopt_array($curl, [CURLOPT_FOLLOWLOCATION => false, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 45, CURLOPT_RESOLVE => [$host.':443:'.$addresses[0]], CURLOPT_WRITEFUNCTION => function ($curl, $chunk) use ($handle, &$bytes, &$tooLarge) {
                    $bytes += strlen($chunk);
                    if ($bytes > 20 * 1024 * 1024) {
                        $tooLarge = true;

                        return 0;
                    }

                    return fwrite($handle, $chunk);
                }]);
                $ok = curl_exec($curl);
                $status = curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
                curl_close($curl);
                fclose($handle);
                $handle = null;
                if (! $ok || $status !== 200 || $bytes === 0 || $tooLarge) {
                    throw ValidationException::withMessages(['files' => 'Could not retrieve the original file (expired, unavailable, or over 20 MB). Resubmit the file using the same capture key.']);
                }
                $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($tmp);
                if (! in_array($mime, ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'], true)) {
                    throw ValidationException::withMessages(['files' => 'Only photos and PDFs are accepted.']);
                }
                $sha = hash_file('sha256', $tmp);
                if ($capture->attachments()->where('sha256', $sha)->exists()) {
                    continue;
                }
                $path = 'evidence/'.$capture->workspace_id.'/'.Str::uuid();
                $stream = fopen($tmp, 'rb');
                try {
                    Storage::disk('local')->put($path, $stream);
                } finally {
                    fclose($stream);
                }
                try {
                    Attachment::create(['workspace_id' => $capture->workspace_id, 'capture_id' => $capture->id, 'original_name' => mb_substr(basename($file['file_name'] ?? $file['file_id']), 0, 200), 'path' => $path, 'mime_type' => $mime, 'bytes' => $bytes, 'sha256' => $sha]);
                } catch (\Throwable $e) {
                    Storage::disk('local')->delete($path);
                    throw $e;
                }
            } finally {
                if (is_resource($handle)) {
                    fclose($handle);
                } if (file_exists($tmp)) {
                    unlink($tmp);
                }
            }
        }
    }
}
