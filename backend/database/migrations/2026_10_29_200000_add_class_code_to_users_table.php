<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Teachers are stored in `users`. Each teacher gets a short class code
     * that their pupils type on the PUPIL LOGIN screen.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('class_code', 8)->nullable()->unique()->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['class_code']);
            $table->dropColumn('class_code');
        });
    }
};
