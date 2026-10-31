<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeedbackClip extends Model
{
    /**
     * The moment a clip is played after an answer (keep in sync with frontend/src/lib/feedback.ts):
     *  tama_una  = correct on the first try      tama_ulit = correct on the 2nd or 3rd try
     *  mali_2    = wrong, 2 tries left           mali_1    = wrong, 1 try left
     *  naubos    = wrong 3 times (the answer is shown)
     */
    public const KINDS = ['tama_una', 'tama_ulit', 'mali_2', 'mali_1', 'naubos'];

    protected $fillable = ['teacher_id', 'kind', 'label', 'audio_path', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function teacher(): BelongsTo
    {
        return $this->belongsTo(User::class, 'teacher_id');
    }
}
