<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WordSentence extends Model
{
    public const BLANK = '___';

    protected $fillable = ['word_id', 'sentence'];

    public function word(): BelongsTo
    {
        return $this->belongsTo(Word::class);
    }
}
