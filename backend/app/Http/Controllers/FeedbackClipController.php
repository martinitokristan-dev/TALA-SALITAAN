<?php

namespace App\Http\Controllers;

use App\Models\FeedbackClip;
use App\Support\Media;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Teacher-recorded voice clips, one moment each (see FeedbackClip::KINDS). */
class FeedbackClipController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'clips' => $request->user()->feedbackClips()->latest()->get()->map(fn (FeedbackClip $c) => $this->present($c)),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'kind' => ['required', Rule::in(FeedbackClip::KINDS)],
            'label' => ['nullable', 'string', 'max:80'],
            'audio' => ['required', ...Media::AUDIO_RULES],
        ]);

        $clip = $request->user()->feedbackClips()->create([
            'kind' => $data['kind'],
            'label' => $data['label'] ?? null,
            'audio_path' => Media::store($request->file('audio'), 'feedback'),
        ]);

        return response()->json(['clip' => $this->present($clip)], 201);
    }

    /** Move a clip to another moment (it was recorded under the wrong one). */
    public function update(Request $request, FeedbackClip $clip): JsonResponse
    {
        $this->own($request, $clip);
        $data = $request->validate(['kind' => ['required', Rule::in(FeedbackClip::KINDS)]]);
        $clip->update(['kind' => $data['kind']]);

        return response()->json(['clip' => $this->present($clip)]);
    }

    public function toggle(Request $request, FeedbackClip $clip): JsonResponse
    {
        $this->own($request, $clip);
        $clip->update(['is_active' => ! $clip->is_active]);

        return response()->json(['clip' => $this->present($clip)]);
    }

    public function destroy(Request $request, FeedbackClip $clip): JsonResponse
    {
        $this->own($request, $clip);
        Media::delete($clip->audio_path);
        $clip->delete();

        return response()->json(['ok' => true]);
    }

    private function own(Request $request, FeedbackClip $clip): void
    {
        if ($clip->teacher_id !== $request->user()->id) {
            abort(404);
        }
    }

    private function present(FeedbackClip $c): array
    {
        return [
            'id' => $c->id,
            'kind' => $c->kind,
            'label' => $c->label,
            'is_active' => $c->is_active,
            'audio_url' => Media::url($c->audio_path),
        ];
    }
}
