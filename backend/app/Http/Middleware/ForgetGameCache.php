<?php

namespace App\Http\Middleware;

use App\Support\GameCatalog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * After a teacher changes anything (POST/PUT/DELETE that succeeds), drop the cached
 * game content so pupils get the new words, pictures and sentences on their next read.
 * Done here instead of model events because some deletes run as plain queries.
 */
class ForgetGameCache
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! $request->isMethodSafe() && $response->isSuccessful()) {
            GameCatalog::forgetWords();
        }

        return $response;
    }
}
