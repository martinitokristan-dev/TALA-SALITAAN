<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WordSituation extends Model
{
    protected $fillable = [
        'word_id', 'situation', 'choice_a', 'choice_b', 'choice_c', 'correct_choice', 'image_path',
    ];

    public function word(): BelongsTo
    {
        return $this->belongsTo(Word::class);
    }
}
