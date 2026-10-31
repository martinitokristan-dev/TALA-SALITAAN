<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Uploaded pictures and audio.
 *
 *  - Production (CLOUDINARY_URL set): files go to Cloudinary and the database keeps the
 *    file's https URL. Hosts like Render wipe their own disk on every deploy/restart, so
 *    uploads must live outside the server.
 *  - Local development: files live on the "public" disk and are served by
 *    GET /api/media/{path} (no `php artisan storage:link`, which needs symlink rights on Windows).
 *
 * Callers only use store/replace/delete/url and never need to know which one is in use.
 */
class Media
{
    public const DISK = 'public';

    public const FOLDERS = ['words', 'audio', 'distractors', 'situations', 'feedback'];

    public const IMAGE_RULES = ['image', 'mimes:jpg,jpeg,png,webp,gif', 'max:5120'];

    // Browser recordings arrive as webm/ogg (Chrome, Firefox) or mp4/m4a (Safari).
    public const AUDIO_RULES = ['file', 'mimes:mp3,mpga,wav,ogg,oga,opus,webm,weba,m4a,mp4,aac', 'max:10240'];

    public static function store(UploadedFile $file, string $folder): string
    {
        $cloud = self::cloudinary();
        if (! $cloud) {
            return $file->store($folder, self::DISK);
        }

        // Signed upload (https://cloudinary.com/documentation/upload_images#generating_authentication_signatures)
        $params = ['folder' => 'tala-salitaan/'.$folder, 'timestamp' => time()];
        $response = Http::timeout(60)
            ->attach('file', fopen($file->getRealPath(), 'r'), $file->hashName())
            ->post("https://api.cloudinary.com/v1_1/{$cloud['name']}/auto/upload", $params + [
                'api_key' => $cloud['key'],
                'signature' => self::sign($params, $cloud['secret']),
            ]);
        $url = $response->json('secure_url');
        if (! $response->successful() || ! is_string($url)) {
            Log::error('Cloudinary upload failed', ['status' => $response->status(), 'error' => $response->json('error.message')]);
            throw new RuntimeException('Upload failed. Please try again.');
        }

        return $url;
    }

    /** Store a new file and delete the one it replaces. */
    public static function replace(?string $oldPath, UploadedFile $file, string $folder): string
    {
        $newPath = self::store($file, $folder);
        self::delete($oldPath);

        return $newPath;
    }

    public static function delete(?string $path): void
    {
        if (! $path) {
            return;
        }
        if (! self::isRemote($path)) {
            Storage::disk(self::DISK)->delete($path);

            return;
        }
        $cloud = self::cloudinary();
        // .../<cloud>/<image|video|raw>/upload/v123/<public id>.<ext>
        if (! $cloud || ! preg_match('#/(image|video|raw)/upload/(?:v\d+/)?(.+?)(\.[A-Za-z0-9]+)?$#', $path, $m)) {
            return;
        }
        $params = ['public_id' => $m[2], 'timestamp' => time()];
        $response = Http::timeout(30)->asForm()->post("https://api.cloudinary.com/v1_1/{$cloud['name']}/{$m[1]}/destroy", $params + [
            'api_key' => $cloud['key'],
            'signature' => self::sign($params, $cloud['secret']),
        ]);
        if (! $response->successful()) {
            // Not fatal: the record is gone either way; the file just stays in Cloudinary.
            Log::warning('Cloudinary delete failed', ['status' => $response->status(), 'public_id' => $m[2]]);
        }
    }

    public static function url(?string $path): ?string
    {
        if (! $path) {
            return null;
        }

        return self::isRemote($path) ? $path : url('/api/media/'.$path);
    }

    /** Only allow "<folder>/<file name>" paths so the media route cannot read other files. */
    public static function isSafePath(string $path): bool
    {
        $folders = implode('|', self::FOLDERS);

        return (bool) preg_match('#^('.$folders.')/[A-Za-z0-9_\-]+\.[A-Za-z0-9]{2,5}$#', $path);
    }

    private static function isRemote(string $path): bool
    {
        return str_starts_with($path, 'https://');
    }

    /** @return array{name: string, key: string, secret: string}|null from CLOUDINARY_URL=cloudinary://key:secret@name */
    private static function cloudinary(): ?array
    {
        $url = (string) config('services.cloudinary.url');
        if ($url === '' || ! preg_match('#^cloudinary://([^:]+):([^@]+)@(.+)$#', $url, $m)) {
            return null;
        }

        return ['key' => $m[1], 'secret' => $m[2], 'name' => $m[3]];
    }

    private static function sign(array $params, string $secret): string
    {
        ksort($params);

        return sha1(urldecode(http_build_query($params)).$secret);
    }
}
