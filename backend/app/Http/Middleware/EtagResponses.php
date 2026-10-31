<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Conditional GET for the JSON API. Every successful GET gets an ETag (hash of the body).
 * When the app sends it back in If-None-Match and nothing changed, the answer is an empty
 * 304, so a silent refresh costs almost no bandwidth and nothing is re-rendered.
 * "private, no-cache" = the browser may keep it, but must ask again before reusing it.
 */
class EtagResponses
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! $request->isMethod('GET') || $response->getStatusCode() !== 200) {
            return $response;
        }
        $type = (string) $response->headers->get('Content-Type');
        if (! str_contains($type, 'json')) {
            return $response;
        }

        $etag = '"'.hash('xxh128', (string) $response->getContent()).'"';
        $response->headers->set('ETag', $etag);
        if (! $response->headers->has('Cache-Control') || $response->headers->get('Cache-Control') === 'no-cache, private') {
            $response->headers->set('Cache-Control', 'private, no-cache');
        }
        // Let the browser read the ETag across origins (Cloudflare Pages -> Render).
        $response->headers->set('Access-Control-Expose-Headers', 'ETag');

        $sent = array_map('trim', explode(',', (string) $request->headers->get('If-None-Match')));
        if (in_array($etag, $sent, true)) {
            $response->setNotModified();
        }

        return $response;
    }
}
