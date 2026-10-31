<?php

namespace App\Http\Controllers;

use App\Models\Word;
use App\Models\WordDistractor;
use App\Support\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Teacher portal: the 2 word sets (A and B, 15 words each) and each word's
 * picture, pronunciation audio and child-friendly meaning.
 * Content is shared by all teachers so every class plays the same words.
 */
class WordController extends Controller
{
    public function index(): JsonResponse
    {
        $words = Word::with(['distractors', 'sentence', 'situation'])
            ->orderBy('word_set')->orderBy('position')->get();

        return response()->json([
            'words_per_set' => Word::WORDS_PER_SET,
            'sets' => collect(Word::SETS)->mapWithKeys(fn ($set) => [
                $set => $words->where('word_set', $set)->values()->map->toTeacherArray(),
            ]),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'word_set' => ['required', Rule::in(Word::SETS)],
            'position' => ['nullable', 'integer', 'min:1', 'max:'.Word::WORDS_PER_SET],
            ...$this->fieldRules(),
        ]);

        $set = $data['word_set'];
        $taken = Word::where('word_set', $set)->pluck('position')->all();
        if (count($taken) >= Word::WORDS_PER_SET) {
            throw ValidationException::withMessages(['word_set' => "Set {$set} already has ".Word::WORDS_PER_SET.' words.']);
        }

        $position = $data['position'] ?? null;
        if ($position === null) {
            $position = collect(range(1, Word::WORDS_PER_SET))->first(fn ($p) => ! in_array($p, $taken, true));
        } elseif (in_array((int) $position, $taken, true)) {
            throw ValidationException::withMessages(['position' => "Number {$position} is already used in Set {$set}."]);
        }

        $word = new Word([
            'word_set' => $set,
            'position' => $position,
            'word' => trim($data['word']),
            'meaning' => $data['meaning'] ?? null,
            // A random place by default; the teacher can move it in Castle 1 Stage 2.
            'correct_position' => random_int(1, 4),
        ]);
        if ($request->hasFile('image')) {
            $word->image_path = Media::store($request->file('image'), 'words');
        }
        if ($request->hasFile('audio')) {
            $word->audio_path = Media::store($request->file('audio'), 'audio');
        }
        $word->save();

        return response()->json(['word' => $word->toTeacherArray()], 201);
    }

    /** POST (multipart) so files can be replaced in the same request. */
    public function update(Request $request, Word $word): JsonResponse
    {
        $data = $request->validate([
            'word' => ['sometimes', 'required', ...self::WORD_RULES],
            'meaning' => ['sometimes', 'nullable', ...self::MEANING_RULES],
            'image' => ['sometimes', ...Media::IMAGE_RULES],
            'audio' => ['sometimes', ...Media::AUDIO_RULES],
            'remove_audio' => ['sometimes', 'boolean'],
            'correct_position' => ['sometimes', 'integer', 'between:1,4'],
        ]);

        if (array_key_exists('correct_position', $data)) {
            $word->correct_position = (int) $data['correct_position'];
        }

        if (array_key_exists('word', $data)) {
            $word->word = trim($data['word']);
        }
        if (array_key_exists('meaning', $data)) {
            $word->meaning = $data['meaning'];
        }
        if ($request->hasFile('image')) {
            $word->image_path = Media::replace($word->image_path, $request->file('image'), 'words');
        }
        if ($request->hasFile('audio')) {
            $word->audio_path = Media::replace($word->audio_path, $request->file('audio'), 'audio');
        } elseif ($request->boolean('remove_audio')) {
            Media::delete($word->audio_path);
            $word->audio_path = null;
        }
        $word->save();

        return response()->json(['word' => $word->fresh()->toTeacherArray()]);
    }

    public function destroy(Word $word): JsonResponse
    {
        $word->loadMissing(['distractors', 'situation']);
        Media::delete($word->image_path);
        Media::delete($word->audio_path);
        $word->distractors->each(fn (WordDistractor $d) => Media::delete($d->image_path));
        Media::delete($word->situation?->image_path);
        $word->delete();

        return response()->json(['ok' => true]);
    }

    /** Letters (incl. Ñ and accents), spaces, hyphen and apostrophe, e.g. "tag-init". */
    private const WORD_RULES = ['string', 'max:40', 'regex:/^[\pL\pM\s\'\-]+$/u'];

    private const MEANING_RULES = ['string', 'max:500'];

    private function fieldRules(): array
    {
        return [
            'word' => ['required', ...self::WORD_RULES],
            'meaning' => ['nullable', ...self::MEANING_RULES],
            'image' => ['nullable', ...Media::IMAGE_RULES],
            'audio' => ['nullable', ...Media::AUDIO_RULES],
        ];
    }
}
