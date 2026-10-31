<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemAttempt extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['item_result_id', 'attempt_no', 'answer', 'is_correct'];

    protected function casts(): array
    {
        return ['is_correct' => 'boolean', 'attempt_no' => 'integer'];
    }

    public function result(): BelongsTo
    {
        return $this->belongsTo(ItemResult::class, 'item_result_id');
    }
}
