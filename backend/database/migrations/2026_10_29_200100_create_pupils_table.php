<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pupils', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 60);
            $table->timestamp('consented_at')->nullable();
            $table->timestamp('last_played_at')->nullable();
            $table->timestamps();

            // A returning pupil types the same name and continues their progress.
            $table->unique(['teacher_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pupils');
    }
};
