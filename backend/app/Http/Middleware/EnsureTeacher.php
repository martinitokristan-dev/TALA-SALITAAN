<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/** Only teacher tokens may use teacher routes (pupil tokens are rejected). */
class EnsureTeacher
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user() instanceof User) {
            return response()->json(['message' => 'Teacher login required.'], 403);
        }

        return $next($request);
    }
}
