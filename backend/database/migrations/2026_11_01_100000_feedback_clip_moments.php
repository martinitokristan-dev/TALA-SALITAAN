<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Feedback clips: from two kinds (praise / try_again) to five moments (FeedbackClip::KINDS).
 * Existing clips are kept: praise -> tama_una, try_again -> mali_2 (teachers can move them).
 * The column is already varchar(16), long enough for the new names.
 */
return new class extends Migration
{
    private const MAP = ['praise' => 'tama_una', 'try_again' => 'mali_2'];

    public function up(): void
    {
        foreach (self::MAP as $old => $new) {
            DB::table('feedback_clips')->where('kind', $old)->update(['kind' => $new]);
        }
    }

    public function down(): void
    {
        // Back to the two old kinds: every "correct" moment is praise, every "wrong" moment try_again.
        DB::table('feedback_clips')->whereIn('kind', ['tama_una', 'tama_ulit'])->update(['kind' => 'praise']);
        DB::table('feedback_clips')->whereIn('kind', ['mali_2', 'mali_1', 'naubos'])->update(['kind' => 'try_again']);
    }
};
