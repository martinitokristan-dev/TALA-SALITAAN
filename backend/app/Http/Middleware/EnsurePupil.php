<?php

namespace App\Http\Middleware;

use App\Models\Pupil;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Only pupil tokens may use game routes. */
class EnsurePupil
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() instanceof Pupil) {
            return response()->json(['message' => 'Pupil login required.'], 403);
        }

        return $next($request);
    }
}
