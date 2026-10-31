<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Uploaded pictures and audio live on the "public" disk and are served by
 * GET /api/media/{path}. That avoids `php artisan storage:link`, which needs
 * symlink rights on Windows/XAMPP.
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
        return $file->store($folder, self::DISK);
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
        if ($path) {
            Storage::disk(self::DISK)->delete($path);
        }
    }

    public static function url(?string $path): ?string
    {
        return $path ? url('/api/media/'.$path) : null;
    }

    /** Only allow "<folder>/<file name>" paths so the media route cannot read other files. */
    public static function isSafePath(string $path): bool
    {
        $folders = implode('|', self::FOLDERS);

        return (bool) preg_match('#^('.$folders.')/[A-Za-z0-9_\-]+\.[A-Za-z0-9]{2,5}$#', $path);
    }
}
