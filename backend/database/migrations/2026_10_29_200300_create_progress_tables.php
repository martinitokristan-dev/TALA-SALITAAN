<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Pupil progress.
     *
     * item_results: one row per pupil + cycle + sesyon + stage + word.
     *   Stars: correct on try 1 = 5, try 2 = 4, try 3 = 3, wrong 3 times = 0.
     * item_attempts: every answer the pupil gave, so teachers can review them.
     */
    public function up(): void
    {
        Schema::create('item_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pupil_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('cycle');  // 1..3
            $table->unsignedTinyInteger('sesyon'); // 1..3
            $table->unsignedTinyInteger('stage');  // 1..2
            $table->foreignId('word_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('attempts_used')->default(0);
            $table->boolean('is_correct')->default(false);
            $table->unsignedTinyInteger('stars')->default(0);
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->unique(['pupil_id', 'cycle', 'sesyon', 'stage', 'word_id'], 'item_results_unique_item');
        });

        Schema::create('item_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_result_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('attempt_no');
            $table->string('answer', 255);
            $table->boolean('is_correct');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('item_attempts');
        Schema::dropIfExists('item_results');
    }
};
