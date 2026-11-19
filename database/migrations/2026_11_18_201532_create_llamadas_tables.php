<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('llamadas', function (Blueprint $table): void {
            $table->engine('InnoDB');
            $table->id();
            $table->unsignedBigInteger('match_id');
            $table->unsignedBigInteger('iniciador_id');
            $table->unsignedBigInteger('destinatario_id');
            $table->string('tipo', 5);
            $table->string('estado', 12);
            $table->dateTime('vence_en')->index();
            $table->index(['iniciador_id', 'estado']);
            $table->index(['destinatario_id', 'estado']);
        });

        Schema::create('llamada_bloqueos', function (Blueprint $table): void {
            $table->engine('InnoDB');
            $table->unsignedBigInteger('user_id')->primary();
        });

        Schema::create('llamada_senales', function (Blueprint $table): void {
            $table->engine('InnoDB');
            $table->id();
            $table->foreignId('llamada_id')->constrained('llamadas')->cascadeOnDelete();
            $table->unsignedBigInteger('remitente_id');
            $table->string('tipo', 6);
            $table->text('datos');
            $table->index(['llamada_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('llamada_senales');
        Schema::dropIfExists('llamada_bloqueos');
        Schema::dropIfExists('llamadas');
    }
};
