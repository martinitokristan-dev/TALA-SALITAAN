<?php

namespace App\Http\Controllers;

use App\Support\GameCatalog;

abstract class Controller
{
    /**
     * One game catalog per request: it memoizes words and results while answering one
     * request, and must never be reused for the next one (the controller object and the
     * container can live longer than a request, e.g. under Octane or in tests).
     */
    protected function catalog(): GameCatalog
    {
        $request = request();
        $catalog = $request->attributes->get('game_catalog');
        if (! $catalog instanceof GameCatalog) {
            $catalog = new GameCatalog;
            $request->attributes->set('game_catalog', $catalog);
        }

        return $catalog;
    }
}
