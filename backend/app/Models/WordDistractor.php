<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WordDistractor extends Model
{
    protected $fillable = ['word_id', 'slot', 'image_path'];

    public function word(): BelongsTo
    {
        return $this->belongsTo(Word::class);
    }
}
