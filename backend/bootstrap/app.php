<?php

use App\Http\Middleware\EnsurePupil;
use App\Http\Middleware\EtagResponses;
use App\Http\Middleware\EnsureTeacher;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->alias([
            'teacher' => EnsureTeacher::class,
            'pupil' => EnsurePupil::class,
        ]);
        // ETag + 304 for every JSON GET (silent refresh costs ~nothing when unchanged).
        $middleware->api(append: [EtagResponses::class]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // API clients always get JSON errors, never HTML pages or login redirects.
        $exceptions->shouldRenderJsonWhen(fn ($request) => $request->is('api/*') || $request->expectsJson());
    })->create();
