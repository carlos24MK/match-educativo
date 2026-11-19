<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('perfiles', function (Blueprint $table) {
            $table->string('programa', 100)->default('');
            $table->unsignedTinyInteger('semestre')->nullable();
            $table->string('preferencias_estudio', 160)->default('');
            $table->string('foto_path')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('perfiles', function (Blueprint $table) {
            $table->dropColumn(['programa', 'semestre', 'preferencias_estudio', 'foto_path']);
        });
    }
};
