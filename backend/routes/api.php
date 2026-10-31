<?php

use App\Http\Controllers\FeedbackClipController;
use App\Http\Controllers\GameController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\PupilAuthController;
use App\Http\Controllers\PupilResultsController;
use App\Http\Controllers\SectionController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\TeacherAuthController;
use App\Http\Controllers\WordContentController;
use App\Http\Controllers\WordController;
use App\Http\Middleware\ForgetGameCache;
use Illuminate\Support\Facades\Route;

// ── Public ────────────────────────────────────────────────────────────────
Route::get('/ping', fn () => response()->json(['status' => 'ok']));
Route::get('/consent', [SettingsController::class, 'consent']);
Route::get('/media/{path}', [MediaController::class, 'show'])->where('path', '.*');

// No public sign-up: teacher accounts are made with `php artisan teacher:create` (routes/console.php).
Route::post('/teacher/login', [TeacherAuthController::class, 'login']);

Route::get('/sections', [SectionController::class, 'open']);
Route::post('/pupil/login', [PupilAuthController::class, 'login'])->middleware('throttle:30,1');
Route::post('/pupil/check', [PupilAuthController::class, 'check'])->middleware('throttle:30,1');

// ── Teacher portal ────────────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'teacher', ForgetGameCache::class])->prefix('teacher')->group(function () {
    Route::get('/me', [TeacherAuthController::class, 'me']);
    Route::post('/logout', [TeacherAuthController::class, 'logout']);

    Route::get('/words', [WordController::class, 'index']);
    Route::post('/words', [WordController::class, 'store']);
    Route::post('/words/{word}', [WordController::class, 'update']);
    Route::delete('/words/{word}', [WordController::class, 'destroy']);

    Route::post('/words/{word}/distractors/{slot}', [WordContentController::class, 'storeDistractor'])->whereNumber('slot');
    Route::delete('/words/{word}/distractors/{slot}', [WordContentController::class, 'destroyDistractor'])->whereNumber('slot');
    Route::put('/words/{word}/sentence', [WordContentController::class, 'saveSentence']);
    Route::delete('/words/{word}/sentence', [WordContentController::class, 'destroySentence']);
    Route::post('/words/{word}/situation', [WordContentController::class, 'saveSituation']);
    Route::delete('/words/{word}/situation', [WordContentController::class, 'destroySituation']);

    Route::get('/settings', [SettingsController::class, 'show']);
    Route::put('/settings', [SettingsController::class, 'update']);

    Route::get('/sections', [SectionController::class, 'index']);
    Route::post('/sections', [SectionController::class, 'store']);
    Route::put('/sections/{section}', [SectionController::class, 'update']);
    Route::delete('/sections/{section}', [SectionController::class, 'destroy']);

    Route::get('/pupils', [PupilResultsController::class, 'index']);
    Route::get('/pupils/{pupil}', [PupilResultsController::class, 'show']);
    Route::post('/pupils/{pupil}/reset', [PupilResultsController::class, 'reset']);
    Route::delete('/pupils/{pupil}', [PupilResultsController::class, 'destroy']);

    Route::get('/feedback-clips', [FeedbackClipController::class, 'index']);
    Route::post('/feedback-clips', [FeedbackClipController::class, 'store']);
    Route::post('/feedback-clips/{clip}/toggle', [FeedbackClipController::class, 'toggle']);
    Route::put('/feedback-clips/{clip}', [FeedbackClipController::class, 'update']);
    Route::delete('/feedback-clips/{clip}', [FeedbackClipController::class, 'destroy']);
});

// ── Pupil game ────────────────────────────────────────────────────────────
Route::middleware(['auth:sanctum', 'pupil'])->group(function () {
    Route::get('/pupil/me', [PupilAuthController::class, 'me']);
    Route::post('/pupil/logout', [PupilAuthController::class, 'logout']);

    Route::post('/pupil/character', [PupilAuthController::class, 'character']);
    Route::get('/game/version', [GameController::class, 'version']);
    Route::get('/game/progress', [GameController::class, 'progress']);
    Route::get('/game/cycles/{cycle}/sesyons/{sesyon}', [GameController::class, 'sesyon'])
        ->whereNumber(['cycle', 'sesyon']);
    Route::post('/game/answer', [GameController::class, 'answer'])->middleware('throttle:120,1');
    Route::get('/game/feedback-clips', [GameController::class, 'feedbackClips']);
});
