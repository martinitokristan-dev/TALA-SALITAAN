<?php

namespace App\Http\Controllers;

use App\Models\Pupil;
use App\Models\Section;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * Pupil flow: SIMULAN -> CONCENT -> PUPIL LOGIN -> pick section -> TALA-PANGALAN -> map.
 * The same name in the same section continues where that pupil stopped.
 */
class PupilAuthController extends Controller
{
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'section_id' => ['required', 'integer'],
            'name' => ['required', 'string', 'min:1', 'max:60'],
            'consented' => ['accepted'],
        ]);

        $section = $this->openSection($data['section_id']);
        $name = $this->cleanName($data['name']);

        $pupil = Pupil::where('section_id', $section->id)->where('name', $name)->first()
            ?? Pupil::create(['section_id' => $section->id, 'name' => $name]);
        $pupil->forceFill([
            'consented_at' => $pupil->consented_at ?? now(),
            'last_played_at' => now(),
        ])->save();

        return response()->json([
            'token' => $pupil->createToken('pupil', ['pupil'])->plainTextToken,
            'pupil' => $this->present($pupil, $section),
            'progress' => $this->catalog()->progress($pupil),
        ]);
    }

    /**
     * Before signing in: is this name already a player in THIS section, and where did they stop?
     * The app asks "Ikaw ba ito? Ipagpatuloy?" with that place. Each section is separate, so a
     * name that played in another section is a new player here. Creates nothing, gives no token.
     */
    public function check(Request $request): JsonResponse
    {
        $data = $request->validate([
            'section_id' => ['required', 'integer'],
            'name' => ['required', 'string', 'min:1', 'max:60'],
        ]);
        $section = $this->openSection($data['section_id']);
        $name = $this->cleanName($data['name']);
        $pupil = Pupil::where('section_id', $section->id)->where('name', $name)->first();

        return response()->json([
            'name' => $name,
            'section' => ['id' => $section->id, 'name' => $section->name],
            'returning' => (bool) $pupil,
            'resume' => $pupil ? $this->resumePoint($pupil) : null,
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var Pupil $pupil */
        $pupil = $request->user();

        return response()->json(['pupil' => $this->present($pupil, $pupil->section)]);
    }

    /** PILIIN ANG KARAKTER: saves the chosen 3D character. */
    public function character(Request $request): JsonResponse
    {
        $data = $request->validate(['character' => ['required', 'in:'.implode(',', Pupil::CHARACTERS)]]);
        /** @var Pupil $pupil */
        $pupil = $request->user();
        $pupil->forceFill(['character' => $data['character']])->save();

        return response()->json(['pupil' => $this->present($pupil, $pupil->section)]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['ok' => true]);
    }

    private function openSection(int|string $id): Section
    {
        $section = Section::where('id', $id)->where('is_active', true)->first();
        if (! $section) {
            throw ValidationException::withMessages(['section_id' => 'Hindi bukas ang seksyon na ito. Pumili ulit.']);
        }

        return $section;
    }

    /** Uppercase with single spaces, so "juan  dela cruz" and "Juan Dela Cruz" are the same pupil. */
    private function cleanName(string $raw): string
    {
        $name = mb_strtoupper(preg_replace('/\s+/u', ' ', trim($raw)));
        if ($name === '') {
            throw ValidationException::withMessages(['name' => 'Ilagay ang pangalan.']);
        }

        return $name;
    }

    /**
     * Where the pupil stopped: the first unfinished sesyon (map, sesyon, stage, level), or
     * finished = true when every sesyon is done. Level numbers match the level path.
     */
    private function resumePoint(Pupil $pupil): array
    {
        $cycles = $this->catalog()->progress($pupil);
        $stars = array_sum(array_column($cycles, 'stars'));
        $base = ['stars' => $stars, 'last_played_at' => $pupil->last_played_at?->toIso8601String()];

        foreach ($cycles as $c) {
            foreach ($c['sesyons'] as $s) {
                if ($s['status'] !== 'unlocked' || $s['word_count'] === 0) {
                    continue;
                }
                $total = $s['word_count'];
                $stage = $s['stage1_done'] < $total ? 1 : 2;
                $inStage = min($total, ($stage === 1 ? $s['stage1_done'] : $s['stage2_done']) + 1);

                return $base + [
                    'finished' => false,
                    'cycle' => $c['cycle'],
                    'cycle_title' => $c['title'],
                    'sesyon' => $s['sesyon'],
                    'stage' => $stage,
                    'level' => $stage === 1 ? $inStage : $total + $inStage,
                    'level_in_stage' => $inStage,
                    'stage_total' => $total,
                ];
            }
        }

        return $base + ['finished' => true];
    }

    private function present(Pupil $pupil, ?Section $section): array
    {
        return [
            'id' => $pupil->id,
            'name' => $pupil->name,
            'character' => $pupil->character,
            'section' => $section ? ['id' => $section->id, 'name' => $section->name] : null,
        ];
    }
}
