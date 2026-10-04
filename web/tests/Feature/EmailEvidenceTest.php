<?php

namespace Tests\Feature;

use App\Models\Capture;
use App\Services\EmailEvidence;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\CreatesBrain;
use Tests\TestCase;

class EmailEvidenceTest extends TestCase
{
    use CreatesBrain,LazilyRefreshDatabase;

    public function test_uploaded_email_preserves_original_and_extracts_text_without_html_execution(): void
    {
        Storage::fake('local');
        $user = $this->owner();
        $this->signedIn($user);
        $email = "From: Supplier <parts@example.test>\r\nSubject: Parts receipt\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n<p>Water pump $89.79</p><script>untrusted_script()</script><img src=\"https://example.test/track\">";
        $this->post('/captures', ['kind' => 'document', 'title' => 'Email receipt', 'clear_match' => false, 'data' => [], 'idempotency_key' => 'email-1', 'files' => [UploadedFile::fake()->createWithContent('receipt.eml', $email)]])->assertRedirect();
        $capture = Capture::first();
        $this->assertSame('review', $capture->status);
        $this->assertStringContainsString('Water pump $89.79', $capture->notes);
        $this->assertStringNotContainsString('untrusted_script', $capture->notes);
        $original = $capture->attachments()->first();
        $this->assertSame($email, Storage::disk('local')->get($original->path));
    }

    public function test_email_parser_failure_does_not_delete_original(): void
    {
        Storage::fake('local');
        $user = $this->owner();
        $this->signedIn($user);
        $this->mock(EmailEvidence::class, fn ($mock) => $mock->shouldReceive('extract')->once()->andThrow(new \RuntimeException('Parse failed')));
        $email = "From: parts@example.test\r\nSubject: Receipt\r\n\r\nKeep this original.";
        $this->post('/captures', ['kind' => 'document', 'title' => 'Email receipt', 'clear_match' => false, 'data' => [], 'idempotency_key' => 'email-2', 'files' => [UploadedFile::fake()->createWithContent('receipt.eml', $email)]])->assertRedirect();
        $capture = Capture::first();
        $this->assertStringContainsString('original email is preserved', $capture->notes);
        $this->assertSame($email, Storage::disk('local')->get($capture->attachments()->first()->path));
    }
}
