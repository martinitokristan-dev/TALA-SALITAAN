<?php

namespace App\Http\Controllers;

use App\Models\Word;
use App\Models\WordDistractor;
use App\Models\WordSentence;
use App\Models\WordSituation;
use App\Support\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Stage 2 content per word:
 *  - Cycle 1: 3 wrong pictures (slots 1-3).
 *  - Cycle 2: one sentence with a blank "___" that the word fills.
 *  - Cycle 3: a situation with responses a, b, c.
 */
class WordContentController extends Controller
{
    public function storeDistractor(Request $request, Word $word, int $slot): JsonResponse
    {
        if ($slot < 1 || $slot > 3) {
            abort(404);
        }
        $request->validate(['image' => ['required', ...Media::IMAGE_RULES]]);

        $existing = WordDistractor::where('word_id', $word->id)->where('slot', $slot)->first();
        $path = Media::replace($existing?->image_path, $request->file('image'), 'distractors');

        WordDistractor::updateOrCreate(['word_id' => $word->id, 'slot' => $slot], ['image_path' => $path]);

        return $this->wordResponse($word);
    }

    public function destroyDistractor(Word $word, int $slot): JsonResponse
    {
        $d = WordDistractor::where('word_id', $word->id)->where('slot', $slot)->first();
        if ($d) {
            Media::delete($d->image_path);
            $d->delete();
        }

        return $this->wordResponse($word);
    }

    public function saveSentence(Request $request, Word $word): JsonResponse
    {
        $data = $request->validate(['sentence' => ['required', 'string', 'max:300']]);
        $sentence = trim(preg_replace('/_{2,}/', WordSentence::BLANK, $data['sentence']));

        if (substr_count($sentence, WordSentence::BLANK) !== 1) {
            throw ValidationException::withMessages([
                'sentence' => 'Put exactly one blank "___" where the word goes.',
            ]);
        }

        WordSentence::updateOrCreate(['word_id' => $word->id], ['sentence' => $sentence]);

        return $this->wordResponse($word);
    }

    public function destroySentence(Word $word): JsonResponse
    {
        WordSentence::where('word_id', $word->id)->delete();

        return $this->wordResponse($word);
    }

    /** POST (multipart): situation text, choices, correct choice, optional picture. */
    public function saveSituation(Request $request, Word $word): JsonResponse
    {
        $data = $request->validate([
            'situation' => ['required', 'string', 'max:600'],
            'choice_a' => ['required', 'string', 'max:255'],
            'choice_b' => ['required', 'string', 'max:255'],
            'choice_c' => ['required', 'string', 'max:255'],
            'correct_choice' => ['required', Rule::in(['a', 'b', 'c'])],
            'image' => ['nullable', ...Media::IMAGE_RULES],
            'remove_image' => ['sometimes', 'boolean'],
        ]);

        $situation = WordSituation::firstOrNew(['word_id' => $word->id]);
        $situation->fill(collect($data)->only([
            'situation', 'choice_a', 'choice_b', 'choice_c', 'correct_choice',
        ])->all());

        if ($request->hasFile('image')) {
            $situation->image_path = Media::replace($situation->image_path, $request->file('image'), 'situations');
        } elseif ($request->boolean('remove_image')) {
            Media::delete($situation->image_path);
            $situation->image_path = null;
        }
        $situation->save();

        return $this->wordResponse($word);
    }

    public function destroySituation(Word $word): JsonResponse
    {
        $s = WordSituation::where('word_id', $word->id)->first();
        if ($s) {
            Media::delete($s->image_path);
            $s->delete();
        }

        return $this->wordResponse($word);
    }

    /** Every change answers with the word's fresh portal data (what the teacher sees). */
    private function wordResponse(Word $word): JsonResponse
    {
        return response()->json(['word' => $word->fresh()->toTeacherArray()]);
    }
}
