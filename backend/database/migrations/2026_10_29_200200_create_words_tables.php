<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Game content entered by teachers.
     *
     * - words: 2 sets (A = Sesyon 1, B = Sesyon 2) of 15 words each. Sesyon 3 uses both.
     *   Used by Stage 1 of every cycle (picture + jumbled letters + meaning + pronunciation).
     * - word_distractors: Cycle 1 Stage 2, the 3 wrong pictures shown next to the word's picture.
     * - word_sentences: Cycle 2 Stage 2, a sentence with a blank (___) that this word fills.
     * - word_situations: Cycle 3 Stage 2, a situation with responses a/b/c.
     */
    public function up(): void
    {
        Schema::create('words', function (Blueprint $table) {
            $table->id();
            $table->char('word_set', 1); // 'A' or 'B'
            $table->unsignedTinyInteger('position'); // 1..15
            $table->string('word', 40);
            $table->text('meaning')->nullable();
            $table->string('image_path')->nullable();
            $table->string('audio_path')->nullable();
            $table->timestamps();

            $table->unique(['word_set', 'position']);
        });

        Schema::create('word_distractors', function (Blueprint $table) {
            $table->id();
            $table->foreignId('word_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('slot'); // 1..3
            $table->string('image_path');
            $table->timestamps();

            $table->unique(['word_id', 'slot']);
        });

        Schema::create('word_sentences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('word_id')->unique()->constrained()->cascadeOnDelete();
            $table->text('sentence'); // must contain "___" where the word goes
            $table->timestamps();
        });

        Schema::create('word_situations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('word_id')->unique()->constrained()->cascadeOnDelete();
            $table->text('situation');
            $table->string('choice_a');
            $table->string('choice_b');
            $table->string('choice_c');
            $table->char('correct_choice', 1); // 'a' | 'b' | 'c'
            $table->string('image_path')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('word_situations');
        Schema::dropIfExists('word_sentences');
        Schema::dropIfExists('word_distractors');
        Schema::dropIfExists('words');
    }
};
