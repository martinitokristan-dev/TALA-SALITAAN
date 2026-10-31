<?php

namespace App\Support;

/**
 * Star rule for every item in every cycle:
 * correct on try 1 = 5 stars, try 2 = 4, try 3 = 3. Wrong 3 times = 0 and the game moves on.
 */
class Stars
{
    public const MAX_ATTEMPTS = 3;
    public const MAX_STARS = 5;

    public static function forCorrectAttempt(int $attemptNo): int
    {
        return max(0, self::MAX_STARS + 1 - $attemptNo);
    }
}
