<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Sections (game rooms): pupils pick their section, then type their name.
     * The same name in two sections is two different pupils with separate progress.
     */
    public function up(): void
    {
        Schema::create('sections', function (Blueprint $table) {
            $table->id();
            $table->string('name', 60)->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::table('pupils', function (Blueprint $table) {
            $table->dropUnique(['name']);
        });
        Schema::table('pupils', function (Blueprint $table) {
            // Nullable only so older rows survive; the app always sets it.
            $table->foreignId('section_id')->nullable()->after('id')->constrained()->cascadeOnDelete();
            $table->unique(['section_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::table('pupils', function (Blueprint $table) {
            $table->dropForeign(['section_id']);
            $table->dropUnique(['section_id', 'name']);
            $table->dropColumn('section_id');
            $table->unique('name');
        });
        Schema::dropIfExists('sections');
    }
};
