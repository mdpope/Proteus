<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use App\Models\Capture;
use App\Models\Vehicle;
use App\Services\CaptureIngestor;
use App\Services\EmailEvidence;
use App\Services\TenantAccess;
use Illuminate\Contracts\View\View;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CaptureController extends Controller
{
    public function index(Request $request, TenantAccess $access): View
    {
        $workspace = $access->workspace($request->user());

        return view('captures.index', ['captures' => $access->captures($request->user())->with('vehicle')->withCount('attachments')->latest()->paginate(30), 'vehicles' => Vehicle::where('workspace_id', $workspace)->get()]);
    }

    public function create(Request $request, TenantAccess $access): View
    {
        return view('captures.form', ['vehicles' => Vehicle::where('workspace_id', $access->workspace($request->user(), 'garage.add'))->get(), 'capture' => null]);
    }

    public function show(Request $request, int $capture, TenantAccess $access): View
    {
        $capture = $access->captures($request->user())->with('attachments')->findOrFail($capture);

        return view('captures.form', ['vehicles' => Vehicle::where('workspace_id', $capture->workspace_id)->get(), 'capture' => $capture]);
    }

    public function store(Request $request, CaptureIngestor $ingestor): RedirectResponse|JsonResponse
    {
        $request->validate(['files' => 'nullable|array|max:12', 'files.*' => 'file|max:20480|mimetypes:image/jpeg,image/png,image/webp,application/pdf,image/heic,image/heif,message/rfc822,text/plain']);
        $input = $request->all();
        if (! $request->isJson()) {
            $input['uncertainties'] = [];
            $input['data'] = $input['data'] ?? [];
        }
        $capture = $ingestor->ingest($request->user(), $input, 'web');
        $this->attachFiles($request, $capture);
        if ($request->expectsJson()) {
            return response()->json(['id' => $capture->id, 'status' => $capture->status, 'uncertainties' => $capture->uncertainties], 201);
        }

        return redirect()->route('captures.show', $capture)->with('status', $capture->status === 'saved' ? 'Saved to your vehicle history.' : 'Originals saved. Check the details before adding them to history.');
    }

    private function attachFiles(Request $request, Capture $capture): void
    {
        foreach ($request->file('files', []) as $file) {
            $sha = hash_file('sha256', $file->getRealPath());
            if ($capture->attachments()->where('sha256', $sha)->exists()) {
                continue;
            }
            $path = $file->store('evidence/'.$capture->workspace_id, 'local');
            try {
                $attachment = Attachment::create(['workspace_id' => $capture->workspace_id, 'capture_id' => $capture->id, 'original_name' => mb_substr(basename($file->getClientOriginalName()), 0, 200), 'path' => $path, 'mime_type' => $file->getMimeType(), 'bytes' => $file->getSize(), 'sha256' => $sha]);
            } catch (\Throwable $e) {
                Storage::disk('local')->delete($path);
                throw $e;
            }
            if (strtolower($file->getClientOriginalExtension()) === 'eml' || $file->getMimeType() === 'message/rfc822') {
                try {
                    app(EmailEvidence::class)->extract($capture, $attachment);
                } catch (\Throwable $e) {
                    report($e);
                    $capture->update(['notes' => mb_substr(($capture->notes ?? '')."\nEmail preview could not be extracted. The original email is preserved for review.", 0, 20000)]);
                }
            }
        }
    }

    public function accept(Request $request, int $capture, TenantAccess $access, CaptureIngestor $ingestor): RedirectResponse
    {
        $capture = $access->captures($request->user(), 'garage.edit')->findOrFail($capture);
        $request->validate(['files' => 'nullable|array|max:12', 'files.*' => 'file|max:20480|mimetypes:image/jpeg,image/png,image/webp,application/pdf,image/heic,image/heif,message/rfc822,text/plain']);
        $input = $request->all();
        $input['uncertainties'] = [];
        $input['clear_match'] = true;
        $input['idempotency_key'] = $capture->idempotency_key;
        $input['data'] = array_replace(array_intersect_key($capture->payload, array_flip(['parts', 'odometer_approximate'])), $input['data'] ?? []);
        if (($input['kind'] ?? '') === 'oil_analysis') {
            $input['data']['measurements'] = array_values($input['data']['measurements'] ?? []);
        }
        $ingestor->accept($request->user(), $capture, $input);
        $this->attachFiles($request, $capture);

        return redirect()->route('captures.show', $capture)->with('status', 'Reviewed and saved.');
    }

    public function download(Request $request, int $attachment, TenantAccess $access): StreamedResponse
    {
        $attachment = Attachment::where('workspace_id', $access->workspace($request->user()))->findOrFail($attachment);

        if ($attachment->mime_type === 'application/pdf' && ! $request->boolean('download')) {
            return Storage::disk('local')->response($attachment->path, $attachment->original_name, ['Content-Type' => 'application/pdf', 'X-Content-Type-Options' => 'nosniff'], 'inline');
        }

        return Storage::disk('local')->download($attachment->path, $attachment->original_name, ['Content-Type' => 'application/octet-stream', 'X-Content-Type-Options' => 'nosniff']);
    }
}
