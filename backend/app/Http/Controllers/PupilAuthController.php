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

        $section = Section::where('id', $data['section_id'])->where('is_active', true)->first();
        if (! $section) {
            throw ValidationException::withMessages(['section_id' => 'Hindi bukas ang seksyon na ito. Pumili ulit.']);
        }

        // Uppercase so "juan" and "Juan" are the same pupil (the name box shows capitals too).
        $name = mb_strtoupper(preg_replace('/\s+/u', ' ', trim($data['name'])));
        if ($name === '') {
            throw ValidationException::withMessages(['name' => 'Ilagay ang pangalan.']);
        }

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
