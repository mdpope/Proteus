<?php

namespace App\Services;

use App\Models\Attachment;
use App\Models\Capture;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\Process\Process;

class EmailEvidence
{
    public function extract(Capture $capture, Attachment $original): void
    {
        $process = new Process(['python3', base_path('bin/parse-email.py'), Storage::disk('local')->path($original->path)]);
        $process->setTimeout(20);
        $process->mustRun();
        $data = json_decode($process->getOutput(), true, 512, JSON_THROW_ON_ERROR);
        $marker = '[Email evidence: '.$original->sha256.']';
        if (! str_contains($capture->notes ?? '', $marker)) {
            $capture->update(['notes' => mb_substr(($capture->notes ? $capture->notes."\n\n" : '').$marker."\nFrom: ".$data['from']."\nEmail date: ".$data['date']."\nSubject: ".$data['subject']."\n\n".$data['text'], 0, 20000)]);
        }
        foreach ($data['attachments'] as $part) {
            $bytes = base64_decode($part['content'], true);
            if ($bytes === false) {
                continue;
            }
            $sha = hash('sha256', $bytes);
            if ($capture->attachments()->where('sha256', $sha)->exists()) {
                continue;
            }
            $mime = (new \finfo(FILEINFO_MIME_TYPE))->buffer($bytes);
            if (! in_array($mime, ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'], true)) {
                continue;
            }
            $path = 'evidence/'.$capture->workspace_id.'/'.$sha;
            Storage::disk('local')->put($path, $bytes);
            Attachment::create(['workspace_id' => $capture->workspace_id, 'capture_id' => $capture->id, 'original_name' => basename($part['name']), 'path' => $path, 'mime_type' => $mime, 'bytes' => strlen($bytes), 'sha256' => $sha]);
        }
    }
}
