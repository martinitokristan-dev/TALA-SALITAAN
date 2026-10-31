<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;

class TeacherAuthController extends Controller
{
    /** Accounts are created with `php artisan teacher:create` (see routes/console.php). */
    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $throttleKey = 'teacher-login:'.strtolower($data['email']).'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($throttleKey, 8)) {
            throw ValidationException::withMessages(['email' => 'Too many attempts. Try again in a minute.']);
        }

        $user = User::where('email', $data['email'])->first();
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            RateLimiter::hit($throttleKey, 60);
            throw ValidationException::withMessages(['email' => 'Wrong email or password.']);
        }
        RateLimiter::clear($throttleKey);

        return response()->json([
            'token' => $user->createToken('teacher', ['teacher'])->plainTextToken,
            'teacher' => $user->toPublicArray(),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['teacher' => $request->user()->toPublicArray()]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['ok' => true]);
    }
}
