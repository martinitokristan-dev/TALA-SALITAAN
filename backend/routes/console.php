<?php

use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Validator;

/*
 * Teacher accounts are created here (there is no public sign-up page), so only
 * the research team's teachers can log in and change the game content.
 *
 *   php artisan teacher:create teacher1@school.ph --name="Teacher Ana"
 *   php artisan teacher:password teacher1@school.ph
 *   php artisan teacher:list
 */

Artisan::command('teacher:create {email} {--name=}', function (string $email) {
    $name = $this->option('name') ?: $this->ask('Teacher name');
    $password = $this->secret('Password (at least 8 characters)');
    $confirm = $this->secret('Type the password again');

    $validator = Validator::make(
        ['email' => $email, 'name' => $name, 'password' => $password, 'password_confirmation' => $confirm],
        [
            'email' => ['required', 'email', 'max:120', 'unique:users,email'],
            'name' => ['required', 'string', 'max:80'],
            'password' => ['required', 'string', 'min:8', 'max:100', 'confirmed'],
        ]
    );
    if ($validator->fails()) {
        foreach ($validator->errors()->all() as $error) {
            $this->error($error);
        }

        return 1;
    }

    $teacher = User::create(['name' => $name, 'email' => $email, 'password' => $password]);
    $this->info("Created {$teacher->name} <{$teacher->email}>.");

    return 0;
})->purpose('Create a teacher account');

Artisan::command('teacher:password {email}', function (string $email) {
    $teacher = User::where('email', $email)->first();
    if (! $teacher) {
        $this->error("No teacher with email {$email}.");

        return 1;
    }

    $password = $this->secret('New password (at least 8 characters)');
    if (strlen((string) $password) < 8 || $password !== $this->secret('Type it again')) {
        $this->error('Passwords must match and be at least 8 characters.');

        return 1;
    }

    $teacher->update(['password' => $password]);
    $teacher->tokens()->delete(); // log out old sessions
    $this->info("Password changed for {$teacher->email}.");

    return 0;
})->purpose('Change a teacher password');

Artisan::command('teacher:list', function () {
    $this->table(
        ['Name', 'Email'],
        User::orderBy('name')->get()->map(fn (User $t) => [$t->name, $t->email])
    );
})->purpose('List teacher accounts');
