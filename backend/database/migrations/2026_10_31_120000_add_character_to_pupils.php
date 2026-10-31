<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** The 3D character the pupil chose after TALA-PANGALAN: 'lalaki' or 'babae'. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pupils', function (Blueprint $table) {
            $table->string('character', 12)->nullable()->after('name');
        });
    }

    public function down(): void
    {
        Schema::table('pupils', function (Blueprint $table) {
            $table->dropColumn('character');
        });
    }
};
