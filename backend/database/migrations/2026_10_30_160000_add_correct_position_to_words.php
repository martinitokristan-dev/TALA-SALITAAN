<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Castle 1, Stage 2: where the correct picture sits among the 4 (1 = A ... 4 = D).
     * The teacher chooses it; the wrong pictures fill the other places in order.
     */
    public function up(): void
    {
        Schema::table('words', function (Blueprint $table) {
            $table->unsignedTinyInteger('correct_position')->nullable()->after('audio_path');
        });

        // Existing words get a varied place so the answer is not always first.
        foreach (DB::table('words')->pluck('id') as $id) {
            DB::table('words')->where('id', $id)->update(['correct_position' => ($id * 7) % 4 + 1]);
        }
    }

    public function down(): void
    {
        Schema::table('words', function (Blueprint $table) {
            $table->dropColumn('correct_position');
        });
    }
};
