<?php

namespace App\Http\Controllers;

use App\Models\ItemResult;
use App\Models\Pupil;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Teacher portal: pupils grouped by section, their progress,
 * and every answer the pupil tried.
 */
class PupilResultsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate(['section_id' => ['nullable', 'integer']]);
        $pupils = Pupil::with('section')
            ->when($request->filled('section_id'), fn ($q) => $q->where('section_id', $request->integer('section_id')))
            ->orderByDesc('last_played_at')->orderBy('name')->get();

        return response()->json([
            'pupils' => $pupils->map(function (Pupil $p) {
                $progress = $this->catalog()->progress($p);

                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'section' => $p->section?->name,
                    'last_played_at' => $p->last_played_at?->toIso8601String(),
                    'stars' => array_sum(array_column($progress, 'stars')),
                    'max_stars' => array_sum(array_column($progress, 'max_stars')),
                    'sesyons_completed' => collect($progress)->flatMap(fn ($c) => $c['sesyons'])
                        ->where('status', 'completed')->count(),
                    'current' => $this->currentPlace($progress),
                ];
            }),
        ]);
    }

    public function show(Pupil $pupil): JsonResponse
    {
        $results = ItemResult::with(['word:id,word,word_set,position', 'attempts'])
            ->where('pupil_id', $pupil->id)
            ->orderBy('cycle')->orderBy('sesyon')->orderBy('stage')->orderBy('id')
            ->get();

        return response()->json([
            'pupil' => ['id' => $pupil->id, 'name' => $pupil->name, 'section' => $pupil->section?->name],
            'progress' => $this->catalog()->progress($pupil),
            'results' => $results->map(fn (ItemResult $r) => [
                'cycle' => $r->cycle,
                'sesyon' => $r->sesyon,
                'stage' => $r->stage,
                'word' => $r->word?->word,
                'attempts_used' => $r->attempts_used,
                'is_correct' => $r->is_correct,
                'stars' => $r->stars,
                'finished_at' => $r->finished_at?->toIso8601String(),
                'answers' => $r->attempts->map(fn ($a) => [
                    'attempt_no' => $a->attempt_no,
                    'answer' => $a->answer,
                    'is_correct' => $a->is_correct,
                    'at' => $a->created_at?->toIso8601String(),
                ]),
            ]),
        ]);
    }

    /** Clear a pupil's progress (e.g. after a practice run). */
    public function reset(Pupil $pupil): JsonResponse
    {
        ItemResult::where('pupil_id', $pupil->id)->delete();

        return response()->json(['ok' => true]);
    }

    public function destroy(Pupil $pupil): JsonResponse
    {
        $pupil->tokens()->delete();
        $pupil->delete();

        return response()->json(['ok' => true]);
    }

    private function currentPlace(array $progress): ?array
    {
        foreach ($progress as $cycle) {
            foreach ($cycle['sesyons'] as $s) {
                if ($s['status'] === 'unlocked') {
                    return ['cycle' => $cycle['cycle'], 'title' => $cycle['title'], 'sesyon' => $s['sesyon']];
                }
            }
        }

        return null; // everything completed
    }
}
