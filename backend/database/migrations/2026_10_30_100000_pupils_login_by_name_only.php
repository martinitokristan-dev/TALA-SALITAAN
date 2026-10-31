<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Design flow: PUPIL LOGIN -> TALA-PANGALAN -> map. There is no class code,
     * so pupils no longer belong to one teacher. Every teacher sees every pupil,
     * and a pupil is found by their name.
     */
    public function up(): void
    {
        Schema::table('pupils', function (Blueprint $table) {
            $table->dropForeign(['teacher_id']);
            $table->dropUnique(['teacher_id', 'name']);
        });
        Schema::table('pupils', function (Blueprint $table) {
            $table->dropColumn('teacher_id');
            $table->unique('name');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['class_code']);
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('class_code');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('class_code', 8)->nullable()->unique()->after('email');
        });
        Schema::table('pupils', function (Blueprint $table) {
            $table->dropUnique(['name']);
            $table->foreignId('teacher_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
        });
    }
};
