<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ItemResult extends Model
{
    protected $fillable = [
        'pupil_id', 'cycle', 'sesyon', 'stage', 'word_id',
        'attempts_used', 'is_correct', 'stars', 'finished_at',
    ];

    protected function casts(): array
    {
        return [
            'cycle' => 'integer',
            'sesyon' => 'integer',
            'stage' => 'integer',
            'attempts_used' => 'integer',
            'is_correct' => 'boolean',
            'stars' => 'integer',
            'finished_at' => 'datetime',
        ];
    }

    public function pupil(): BelongsTo
    {
        return $this->belongsTo(Pupil::class);
    }

    public function word(): BelongsTo
    {
        return $this->belongsTo(Word::class);
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(ItemAttempt::class)->orderBy('attempt_no');
    }
}
