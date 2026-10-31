<?php

namespace App\Models;

use App\Support\Media;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Model;

class Word extends Model
{
    public const SETS = ['A', 'B'];
    public const WORDS_PER_SET = 15;

    protected $fillable = ['word_set', 'position', 'word', 'meaning', 'image_path', 'audio_path', 'correct_position'];

    protected function casts(): array
    {
        return ['position' => 'integer', 'correct_position' => 'integer'];
    }

    /** Place (1-4) of the correct picture in Castle 1 Stage 2. */
    public function correctPosition(): int
    {
        $p = (int) $this->correct_position;

        return $p >= 1 && $p <= 4 ? $p : 1;
    }

    public function distractors(): HasMany
    {
        return $this->hasMany(WordDistractor::class)->orderBy('slot');
    }

    public function sentence(): HasOne
    {
        return $this->hasOne(WordSentence::class);
    }

    public function situation(): HasOne
    {
        return $this->hasOne(WordSituation::class);
    }

    /** Which content is still missing for each part of the game. */
    public function missingContent(): array
    {
        $missing = [];
        if (! $this->image_path) {
            $missing[] = 'image';
        }
        if (! $this->audio_path) {
            $missing[] = 'audio';
        }
        if (! trim((string) $this->meaning)) {
            $missing[] = 'meaning';
        }
        if ($this->distractors->count() < 3) {
            $missing[] = 'distractors';
        }
        if (! $this->sentence) {
            $missing[] = 'sentence';
        }
        if (! $this->situation) {
            $missing[] = 'situation';
        }

        return $missing;
    }

    /** Full record for the teacher portal. */
    public function toTeacherArray(): array
    {
        $this->loadMissing(['distractors', 'sentence', 'situation']);

        return [
            'id' => $this->id,
            'word_set' => $this->word_set,
            'position' => $this->position,
            'word' => $this->word,
            'meaning' => $this->meaning,
            'image_url' => Media::url($this->image_path),
            'audio_url' => Media::url($this->audio_path),
            'correct_position' => $this->correctPosition(),
            'distractors' => $this->distractors->map(fn (WordDistractor $d) => [
                'id' => $d->id,
                'slot' => $d->slot,
                'image_url' => Media::url($d->image_path),
            ])->values(),
            'sentence' => $this->sentence?->sentence,
            'situation' => $this->situation ? [
                'situation' => $this->situation->situation,
                'choice_a' => $this->situation->choice_a,
                'choice_b' => $this->situation->choice_b,
                'choice_c' => $this->situation->choice_c,
                'correct_choice' => $this->situation->correct_choice,
                'image_url' => Media::url($this->situation->image_path),
            ] : null,
            'missing' => $this->missingContent(),
        ];
    }
}
