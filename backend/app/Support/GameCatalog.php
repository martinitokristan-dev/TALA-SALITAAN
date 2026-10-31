<?php

namespace App\Support;

use App\Models\ItemResult;
use App\Models\Pupil;
use App\Models\Word;
use App\Models\WordDistractor;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * Game structure (from the guide):
 *  - 3 cycles = 3 castles: 1 Tuklas-Larawan, 2 Tuklas-Pangungusap, 3 Tuklas-Sitwasyon.
 *  - Each castle has Sesyon 1 (15 words, set A), Sesyon 2 (another 15, set B), Sesyon 3 (A + B = 30).
 *  - Each sesyon: Stage 1 (jumbled letters, every word) then Stage 2 (the castle's own strategy, same words).
 *    Castle 1 Stage 2 = 4 pictures, 1 correct.
 *  - Play order: C1S1, C1S2, C1S3, C2S1, ... C3S3. Each one unlocks when the previous is finished.
 */
class GameCatalog
{
    public const CYCLES = [
        1 => 'Tuklas-Larawan',
        2 => 'Tuklas-Pangungusap',
        3 => 'Tuklas-Sitwasyon',
    ];

    public const SESYONS = [1, 2, 3];

    public const STAGES = [1, 2];

    /** Cycle 2 Stage 2 shows a bank of at most this many words, and this many sentences at a time. */
    public const BANK_SIZE = 15;
    public const SENTENCES_PER_ROUND = 3;

    /** Words per set for pupils in a demo-mode section (Sesyon 3 gets twice this). */
    public const DEMO_WORDS = 2;

    /** @var Collection<int, Word>|null */
    private ?Collection $allWords = null;

    /** @return array<int, array{cycle:int, sesyon:int}> */
    public static function order(): array
    {
        $order = [];
        foreach (array_keys(self::CYCLES) as $cycle) {
            foreach (self::SESYONS as $sesyon) {
                $order[] = ['cycle' => $cycle, 'sesyon' => $sesyon];
            }
        }

        return $order;
    }

    public static function isValid(int $cycle, int $sesyon, ?int $stage = null): bool
    {
        return isset(self::CYCLES[$cycle])
            && in_array($sesyon, self::SESYONS, true)
            && ($stage === null || in_array($stage, self::STAGES, true));
    }

    /**
     * All words with their Stage 2 content. The same for every pupil, so it is read from
     * the database once and then served from the cache until a teacher changes something
     * (see forgetWords(), called from the Word / distractor / sentence / situation models).
     */
    private function allWords(): Collection
    {
        return $this->allWords ??= Cache::rememberForever(self::WORDS_CACHE_KEY, fn () => Word::with(['distractors', 'sentence', 'situation'])
            ->orderBy('word_set')
            ->orderBy('position')
            ->get());
    }

    public const WORDS_CACHE_KEY = 'game.words.v1';

    public const CONTENT_VERSION_KEY = 'game.content_version';

    public static function forgetWords(): void
    {
        Cache::forget(self::WORDS_CACHE_KEY);
        // Tells every pupil's app that game content changed (see GameController::version).
        Cache::forever(self::CONTENT_VERSION_KEY, (string) (int) (microtime(true) * 1000));
    }

    /** Changes whenever a teacher edits content, sections or settings. */
    public static function contentVersion(): string
    {
        return Cache::rememberForever(self::CONTENT_VERSION_KEY, fn () => (string) (int) (microtime(true) * 1000));
    }

    /** Changes whenever this pupil's answers, demo mode, or reset change. Cheap: one aggregate query. */
    public static function progressVersion(Pupil $pupil): string
    {
        $agg = ItemResult::where('pupil_id', $pupil->id)
            ->selectRaw('COUNT(*) as n, MAX(updated_at) as t')
            ->first();
        $section = $pupil->section;

        return implode('.', [
            (int) ($agg->n ?? 0),
            $agg->t ? strtotime((string) $agg->t) : 0,
            $section?->is_demo ? 'd' : 'n',
            $section?->updated_at?->getTimestamp() ?? 0,
        ]);
    }

    /**
     * Words of a sesyon in play order. Sesyon 1 and 2 keep the teacher's numbering.
     * Sesyon 3 mixes both sets in an order that is fixed per pupil, so resuming keeps the same order.
     *
     * @return Collection<int, Word>
     */
    public function wordsFor(int $sesyon, ?Pupil $pupil = null): Collection
    {
        $words = $this->allWords();
        $setA = $words->where('word_set', 'A')->values();
        $setB = $words->where('word_set', 'B')->values();

        // Demo mode: only the first few words of each set, so a whole castle can be tested quickly.
        if ($pupil && self::isDemo($pupil)) {
            $setA = $setA->take(self::DEMO_WORDS)->values();
            $setB = $setB->take(self::DEMO_WORDS)->values();
        }

        return match ($sesyon) {
            1 => $setA,
            2 => $setB,
            default => $this->seededShuffle($setA->concat($setB)->values(), $pupil?->id ?? 0),
        };
    }

    /** Pupils of a demo-mode section: everything open, DEMO_WORDS words per set. */
    public static function isDemo(Pupil $pupil): bool
    {
        return (bool) $pupil->section?->is_demo;
    }

    private function seededShuffle(Collection $words, int $seed): Collection
    {
        return $words->sortBy(fn (Word $w) => crc32($seed.'-'.$w->id))->values();
    }

    /** Content a word needs for one stage of one cycle. */
    public static function missingFor(Word $word, int $cycle, int $stage): array
    {
        $missing = array_values(array_intersect(
            $word->missingContent(),
            $stage === 1
                ? ['image', 'audio', 'meaning']
                : match ($cycle) {
                    1 => ['image', 'meaning', 'distractors'],
                    2 => ['sentence'],
                    default => ['situation'],
                }
        ));

        return $missing;
    }

    /** A sesyon is ready when it has words and every word has the content both stages need. */
    public function isReady(int $cycle, int $sesyon, ?Pupil $pupil = null): bool
    {
        $words = $this->wordsFor($sesyon, $pupil);
        if ($words->isEmpty()) {
            return false;
        }

        foreach ($words as $word) {
            foreach (self::STAGES as $stage) {
                if (self::missingFor($word, $cycle, $stage)) {
                    return false;
                }
            }
        }

        return true;
    }

    /** @return Collection<string, ItemResult> keyed "cycle-sesyon-stage-word" */
    public function resultsFor(Pupil $pupil): Collection
    {
        return ItemResult::where('pupil_id', $pupil->id)->get()
            ->keyBy(fn (ItemResult $r) => self::key($r->cycle, $r->sesyon, $r->stage, $r->word_id));
    }

    public static function key(int $cycle, int $sesyon, int $stage, int $wordId): string
    {
        return "{$cycle}-{$sesyon}-{$stage}-{$wordId}";
    }

    /**
     * Map data: status of every cycle and sesyon for one pupil.
     */
    public function progress(Pupil $pupil): array
    {
        $results = $this->resultsFor($pupil);
        $demo = self::isDemo($pupil);
        $previousDone = true;
        $cycles = [];

        foreach (self::CYCLES as $cycle => $title) {
            $sesyons = [];
            foreach (self::SESYONS as $sesyon) {
                $words = $this->wordsFor($sesyon, $pupil);
                $stageDone = [1 => 0, 2 => 0];
                $stars = 0;

                foreach ($words as $word) {
                    foreach (self::STAGES as $stage) {
                        $r = $results->get(self::key($cycle, $sesyon, $stage, $word->id));
                        if ($r && $r->finished_at) {
                            $stageDone[$stage]++;
                            $stars += $r->stars;
                        }
                    }
                }

                $total = $words->count();
                $completed = $total > 0 && $stageDone[1] === $total && $stageDone[2] === $total;
                $unlocked = $previousDone || $demo; // demo mode: every castle and sesyon is open

                $sesyons[] = [
                    'sesyon' => $sesyon,
                    'status' => $completed ? 'completed' : ($unlocked ? 'unlocked' : 'locked'),
                    'ready' => $this->isReady($cycle, $sesyon, $pupil),
                    'word_count' => $total,
                    'stage1_done' => $stageDone[1],
                    'stage2_done' => $stageDone[2],
                    'stars' => $stars,
                    'max_stars' => $total * count(self::STAGES) * Stars::MAX_STARS,
                ];

                $previousDone = $completed;
            }

            $cycles[] = [
                'cycle' => $cycle,
                'title' => $title,
                'status' => collect($sesyons)->every(fn ($s) => $s['status'] === 'completed')
                    ? 'completed'
                    : ($sesyons[0]['status'] === 'locked' ? 'locked' : 'unlocked'),
                'stars' => array_sum(array_column($sesyons, 'stars')),
                'max_stars' => array_sum(array_column($sesyons, 'max_stars')),
                'sesyons' => $sesyons,
            ];
        }

        return $cycles;
    }

    public function sesyonStatus(Pupil $pupil, int $cycle, int $sesyon): array
    {
        $progress = $this->progress($pupil);

        return $progress[$cycle - 1]['sesyons'][$sesyon - 1];
    }

    /**
     * Everything the game needs to play one sesyon. Answers are not included:
     * jumbled letters are shuffled here and the server checks every answer.
     */
    public function sesyonPayload(Pupil $pupil, int $cycle, int $sesyon): array
    {
        $words = $this->wordsFor($sesyon, $pupil);
        $results = $this->resultsFor($pupil);

        $resultFor = function (int $stage, Word $word) use ($results, $cycle, $sesyon) {
            $r = $results->get(self::key($cycle, $sesyon, $stage, $word->id));

            return [
                'attempts_used' => $r?->attempts_used ?? 0,
                'finished' => (bool) $r?->finished_at,
                'is_correct' => (bool) $r?->is_correct,
                'stars' => $r?->stars ?? 0,
                // Once finished, the answer may be shown again (e.g. when resuming).
                'answer' => $r?->finished_at ? $word->word : null,
            ];
        };

        $stage1 = $words->map(fn (Word $w) => [
            'word_id' => $w->id,
            'letters' => self::jumble($w->word, $pupil->id),
            'length' => mb_strlen(self::normalize($w->word)),
            'meaning' => $cycle === 1 ? null : $w->meaning, // Cycle 1 shows the meaning on Stage 2
            'image_url' => Media::url($w->image_path),
            'audio_url' => Media::url($w->audio_path),
            'result' => $resultFor(1, $w),
        ])->values();

        $stage2 = match ($cycle) {
            1 => $words->map(fn (Word $w) => [
                'word_id' => $w->id,
                'word' => $w->word,
                'meaning' => $w->meaning,
                'audio_url' => Media::url($w->audio_path),
                'choices' => self::pictureChoices($w, $pupil->id),
                'result' => $resultFor(2, $w),
            ])->values(),
            2 => $this->sentenceGroups($words, $resultFor),
            default => $words->map(fn (Word $w) => [
                'word_id' => $w->id,
                'word' => $w->word,
                'situation' => $w->situation?->situation,
                'image_url' => Media::url($w->situation?->image_path),
                'choices' => $w->situation ? [
                    ['key' => 'a', 'text' => $w->situation->choice_a],
                    ['key' => 'b', 'text' => $w->situation->choice_b],
                    ['key' => 'c', 'text' => $w->situation->choice_c],
                ] : [],
                'result' => $resultFor(2, $w),
            ])->values(),
        };

        return [
            'cycle' => $cycle,
            'cycle_title' => self::CYCLES[$cycle],
            'sesyon' => $sesyon,
            'max_attempts' => Stars::MAX_ATTEMPTS,
            'max_stars_per_item' => Stars::MAX_STARS,
            'stage1' => $stage1,
            'stage2' => $stage2,
        ];
    }

    /**
     * Cycle 2 Stage 2 (sketch layout): a word bank on top, 3 sentences below.
     * Sesyon 1 and 2 have one group of 15 words. Sesyon 3 (30 words) is split into
     * 2 groups of 15 so the bank never gets crowded.
     */
    private function sentenceGroups(Collection $words, callable $resultFor): array
    {
        return $words->chunk(self::BANK_SIZE)->values()->map(function (Collection $group, int $i) use ($resultFor) {
            return [
                'group' => $i + 1,
                'bank' => $group->map(fn (Word $w) => ['word_id' => $w->id, 'word' => $w->word])
                    ->sortBy(fn ($chip) => crc32('bank-'.$chip['word_id']))
                    ->values(),
                'sentences' => $group->map(fn (Word $w) => [
                    'word_id' => $w->id,
                    'sentence' => $w->sentence?->sentence,
                    'result' => $resultFor(2, $w),
                ])->values(),
            ];
        })->all();
    }

    /** The word's own picture plus its 3 wrong pictures, in a stable mixed order. */
    /**
     * The 4 pictures in the order the teacher set: the correct picture at its chosen
     * place (A-D) and the wrong pictures (slots 1-3) filling the other places in order.
     */
    private static function pictureChoices(Word $word, int $seed): array
    {
        unset($seed); // order is set by the teacher, not shuffled per pupil
        $wrong = $word->distractors->sortBy('slot')->values()->map(fn (WordDistractor $d) => [
            'key' => 'd:'.$d->id,
            'image_url' => Media::url($d->image_path),
        ])->all();
        $correct = ['key' => 'word:'.$word->id, 'image_url' => Media::url($word->image_path)];

        $at = min($word->correctPosition(), count($wrong) + 1);
        array_splice($wrong, $at - 1, 0, [$correct]);

        return $wrong;
    }

    /** Uppercase, no spaces: "Bahay Kubo" and "bahaykubo" are the same answer. */
    public static function normalize(string $text): string
    {
        return mb_strtoupper(preg_replace('/\s+/u', '', $text));
    }

    /** Shuffle the letters, making sure the result is not already the answer. */
    public static function jumble(string $word, int $seed): array
    {
        $letters = mb_str_split(self::normalize($word));
        if (count(array_unique($letters)) < 2) {
            return $letters;
        }

        $original = $letters;
        $attempt = 0;
        do {
            $keyed = [];
            foreach ($letters as $i => $letter) {
                $keyed[] = ['l' => $letter, 'k' => crc32($seed.'-'.$attempt.'-'.$i)];
            }
            usort($keyed, fn ($a, $b) => $a['k'] <=> $b['k']);
            $shuffled = array_column($keyed, 'l');
            $attempt++;
        } while ($shuffled === $original && $attempt < 20);

        return $shuffled;
    }
}
