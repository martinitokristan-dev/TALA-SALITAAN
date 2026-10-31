<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * A child player: a name inside one section. The same name in another
 * section is a different pupil with separate progress.
 */
class Pupil extends Authenticatable
{
    use HasApiTokens;

    public const CHARACTERS = ['lalaki', 'babae'];

    protected $fillable = ['section_id', 'name', 'character', 'consented_at', 'last_played_at'];

    protected function casts(): array
    {
        return [
            'consented_at' => 'datetime',
            'last_played_at' => 'datetime',
        ];
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(Section::class);
    }

    public function results(): HasMany
    {
        return $this->hasMany(ItemResult::class);
    }
}
