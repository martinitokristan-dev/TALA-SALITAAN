<?php

namespace App\Http\Controllers;

use App\Models\FeedbackClip;
use App\Models\ItemAttempt;
use App\Models\ItemResult;
use App\Models\Pupil;
use App\Models\Word;
use App\Support\GameCatalog;
use App\Support\Media;
use App\Support\Stars;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class GameController extends Controller
{
    /**
     * Tiny "did anything change?" check for silent refresh. The app compares these with the
     * versions it stored next to its cached data and only re-downloads what actually changed.
     */
    public function version(Request $request): JsonResponse
    {
        /** @var Pupil $pupil */
        $pupil = $request->user();

        return response()->json([
            'content' => GameCatalog::contentVersion(),
            'progress' => GameCatalog::progressVersion($pupil),
        ]);
    }

    /** Map: status, lock state and stars of every castle and sesyon. */
    public function progress(Request $request): JsonResponse
    {
        return response()->json(['cycles' => $this->catalog()->progress($request->user())]);
    }

    public function sesyon(Request $request, int $cycle, int $sesyon): JsonResponse
    {
        /** @var Pupil $pupil */
        $pupil = $request->user();
        if (! GameCatalog::isValid($cycle, $sesyon)) {
            abort(404);
        }

        if ($error = $this->playableError($pupil, $cycle, $sesyon)) {
            return $error;
        }

        $pupil->forceFill(['last_played_at' => now()])->save();

        return response()->json($this->catalog()->sesyonPayload($pupil, $cycle, $sesyon));
    }

    /**
     * Check one answer. 3 tries per item:
     * correct on try 1/2/3 = 5/4/3 stars; wrong 3 times = 0 stars and the item is finished.
     *
     * Answer formats:
     *  - Stage 1 (all cycles): the arranged letters, e.g. "BAHAY".
     *  - Cycle 1 Stage 2: the picked picture key, e.g. "word:12" or "d:40".
     *  - Cycle 2 Stage 2: the id of the word chip dropped on the sentence, e.g. "12".
     *  - Cycle 3 Stage 2: "a", "b" or "c".
     */
    public function answer(Request $request): JsonResponse
    {
        $data = $request->validate([
            'cycle' => ['required', 'integer'],
            'sesyon' => ['required', 'integer'],
            'stage' => ['required', 'integer'],
            'word_id' => ['required', 'integer'],
            'answer' => ['required', 'string', 'max:120'],
        ]);
        $cycle = (int) $data['cycle'];
        $sesyon = (int) $data['sesyon'];
        $stage = (int) $data['stage'];

        /** @var Pupil $pupil */
        $pupil = $request->user();
        if (! GameCatalog::isValid($cycle, $sesyon, $stage)) {
            return response()->json(['message' => 'Invalid cycle, sesyon or stage.'], 422);
        }
        if ($error = $this->playableError($pupil, $cycle, $sesyon)) {
            return $error;
        }

        $words = $this->catalog()->wordsFor($sesyon, $pupil);
        $word = $words->firstWhere('id', (int) $data['word_id']);
        if (! $word) {
            return response()->json(['message' => 'This word is not part of this sesyon.'], 422);
        }

        // Stage 2 opens only after every Stage 1 word is finished.
        if ($stage === 2) {
            $stage1Done = ItemResult::where('pupil_id', $pupil->id)
                ->where(['cycle' => $cycle, 'sesyon' => $sesyon, 'stage' => 1])
                ->whereNotNull('finished_at')
                ->whereIn('word_id', $words->pluck('id'))
                ->count();
            if ($stage1Done < $words->count()) {
                return response()->json(['message' => 'Tapusin muna ang Stage 1.', 'code' => 'stage_locked'], 423);
            }
        }

        [$isCorrect, $answerLabel] = $this->check($word, $cycle, $stage, trim($data['answer']), $words);
        $key = ['pupil_id' => $pupil->id, 'cycle' => $cycle, 'sesyon' => $sesyon, 'stage' => $stage, 'word_id' => $word->id];
        [$result, $counted] = $this->recordAttempt($key, $isCorrect, $answerLabel);

        $finished = (bool) $result->finished_at;
        $status = $this->catalog()->sesyonStatus($pupil, $cycle, $sesyon);
        $stageDone = $stage === 1 ? $status['stage1_done'] : $status['stage2_done'];

        return response()->json([
            // For a repeated tap on a finished item, report the saved result instead.
            'correct' => $counted ? $isCorrect : $result->is_correct,
            'counted' => $counted,
            'attempts_used' => $result->attempts_used,
            'attempts_left' => max(0, Stars::MAX_ATTEMPTS - $result->attempts_used),
            'finished' => $finished,
            'stars' => $result->stars,
            // Shown after the item is finished (correct, or 3 wrong tries).
            'correct_answer' => $finished ? $this->revealAnswer($word, $cycle, $stage) : null,
            'stage_complete' => $stageDone >= $status['word_count'],
            'sesyon_complete' => $status['status'] === 'completed',
            'sesyon_stars' => $status['stars'],
        ]);
    }

    /** Active teacher clips per moment (FeedbackClip::KINDS), e.g. {"mali_1": [url, ...], ...}. */
    public function feedbackClips(): JsonResponse
    {
        // Pupils are not tied to one teacher, so every teacher's active clips are used.
        $clips = FeedbackClip::where('is_active', true)->get(['kind', 'audio_path']);

        return response()->json(collect(FeedbackClip::KINDS)->mapWithKeys(fn (string $kind) => [
            $kind => $clips->where('kind', $kind)->map(fn ($c) => Media::url($c->audio_path))->values(),
        ]));
    }

    /**
     * Save one try of one item (row-locked, so double taps cannot count twice).
     *
     * @param  array{pupil_id: int, cycle: int, sesyon: int, stage: int, word_id: int}  $key
     * @return array{0: ItemResult, 1: bool} [the item's result, whether this try was counted]
     */
    private function recordAttempt(array $key, bool $isCorrect, string $answerLabel): array
    {
        return DB::transaction(function () use ($key, $isCorrect, $answerLabel) {
            $result = ItemResult::where($key)->lockForUpdate()->first() ?? ItemResult::create($key);

            if ($result->finished_at) {
                return [$result, false]; // already done: do not count extra taps
            }

            $attemptNo = $result->attempts_used + 1;
            ItemAttempt::create([
                'item_result_id' => $result->id,
                'attempt_no' => $attemptNo,
                'answer' => mb_substr($answerLabel, 0, 255),
                'is_correct' => $isCorrect,
            ]);

            $result->attempts_used = $attemptNo;
            if ($isCorrect) {
                $result->is_correct = true;
                $result->stars = Stars::forCorrectAttempt($attemptNo);
                $result->finished_at = now();
            } elseif ($attemptNo >= Stars::MAX_ATTEMPTS) {
                $result->is_correct = false;
                $result->stars = 0;
                $result->finished_at = now();
            }
            $result->save();

            return [$result, true];
        });
    }

    private function playableError(Pupil $pupil, int $cycle, int $sesyon): ?JsonResponse
    {
        $status = $this->catalog()->sesyonStatus($pupil, $cycle, $sesyon);
        if ($status['status'] === 'locked') {
            return response()->json(['message' => 'Tapusin muna ang naunang sesyon.', 'code' => 'locked'], 423);
        }
        if (! $status['ready']) {
            return response()->json(['message' => 'Hindi pa handa ang sesyon na ito.', 'code' => 'not_ready'], 409);
        }

        return null;
    }

    /** @return array{0: bool, 1: string} [is correct, readable answer for the teacher report] */
    private function check(Word $word, int $cycle, int $stage, string $answer, $sesyonWords): array
    {
        if ($stage === 1) {
            return [GameCatalog::normalize($answer) === GameCatalog::normalize($word->word), mb_strtoupper($answer)];
        }

        return match ($cycle) {
            1 => [$answer === 'word:'.$word->id, $this->pictureLabel($word, $answer)],
            2 => [
                (int) $answer === $word->id,
                (string) ($sesyonWords->firstWhere('id', (int) $answer)?->word ?? $answer),
            ],
            default => [
                strtolower($answer) === $word->situation?->correct_choice,
                strtolower($answer).') '.($word->situation?->{'choice_'.strtolower($answer)} ?? ''),
            ],
        };
    }

    private function pictureLabel(Word $word, string $key): string
    {
        if ($key === 'word:'.$word->id) {
            return 'Tamang larawan';
        }
        $slot = $word->distractors->firstWhere('id', (int) substr($key, 2))?->slot;

        return $slot ? "Maling larawan {$slot}" : $key;
    }

    private function revealAnswer(Word $word, int $cycle, int $stage): array
    {
        if ($stage === 1 || $cycle === 2) {
            return ['word' => $word->word, 'word_id' => $word->id];
        }
        if ($cycle === 1) {
            return ['word' => $word->word, 'key' => 'word:'.$word->id];
        }

        return [
            'word' => $word->word,
            'key' => $word->situation?->correct_choice,
        ];
    }
}
