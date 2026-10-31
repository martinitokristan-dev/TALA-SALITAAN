<?php

namespace App\Http\Controllers;

use App\Models\Section;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SectionController extends Controller
{
    /** Public: open sections shown to pupils after PUPIL LOGIN. */
    public function open(): JsonResponse
    {
        return response()->json([
            'sections' => Section::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ])->header('Cache-Control', 'public, max-age=60'); // same for everyone; browsers/CDN may reuse it briefly
    }

    /** Teacher portal: all sections with pupil counts. */
    public function index(): JsonResponse
    {
        return response()->json([
            'sections' => Section::withCount('pupils')->orderBy('name')->get()->map(fn (Section $s) => $this->present($s)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:60', 'unique:sections,name'],
        ]);
        $section = Section::create(['name' => trim($data['name'])]);
        $section->pupils_count = 0;

        return response()->json(['section' => $this->present($section)], 201);
    }

    public function update(Request $request, Section $section): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:60', Rule::unique('sections', 'name')->ignore($section->id)],
            'is_active' => ['sometimes', 'boolean'],
            'is_demo' => ['sometimes', 'boolean'],
        ]);
        if (isset($data['name'])) {
            $data['name'] = trim($data['name']);
        }
        $section->update($data);
        $section->loadCount('pupils');

        return response()->json(['section' => $this->present($section)]);
    }

    /** Deletes the section with its pupils and their answers. */
    public function destroy(Section $section): JsonResponse
    {
        $section->pupils()->each(fn ($p) => $p->tokens()->delete());
        $section->delete();

        return response()->json(['ok' => true]);
    }

    private function present(Section $s): array
    {
        return [
            'id' => $s->id,
            'name' => $s->name,
            'is_active' => $s->is_active,
            'is_demo' => (bool) $s->is_demo,
            'pupils_count' => (int) ($s->pupils_count ?? 0),
        ];
    }
}
