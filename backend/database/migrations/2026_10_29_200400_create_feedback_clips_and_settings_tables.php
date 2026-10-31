<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Teacher-recorded voice clips played on correct ("praise") or wrong ("try_again") answers.
        Schema::create('feedback_clips', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_id')->constrained('users')->cascadeOnDelete();
            $table->string('kind', 16); // see FeedbackClip::KINDS (renamed in 2026_11_01_100000)
            $table->string('label', 80)->nullable();
            $table->string('audio_path');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Editable texts such as the consent statement shown on the CONCENT screen.
        Schema::create('app_settings', function (Blueprint $table) {
            $table->string('key', 64)->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_settings');
        Schema::dropIfExists('feedback_clips');
    }
};
