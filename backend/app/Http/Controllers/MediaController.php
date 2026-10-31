<?php

namespace App\Http\Controllers;

use App\Support\Media;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/** Serves uploaded pictures and audio from storage/app/public. */
class MediaController extends Controller
{
    public function show(string $path): Response
    {
        $disk = Storage::disk(Media::DISK);
        if (! Media::isSafePath($path) || ! $disk->exists($path)) {
            abort(404);
        }

        // Files are never overwritten in place (new uploads get new names), so they can be cached.
        return response()->file($disk->path($path), [
            'Cache-Control' => 'public, max-age=31536000, immutable',
            'Access-Control-Allow-Origin' => '*',
        ]);
    }
}
