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
        Schema::create('horarios_disponibles', function (Blueprint $table): void {
            $table->engine('InnoDB');
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedTinyInteger('dia');
            $table->string('inicio', 5);
            $table->string('fin', 5);
            $table->index(['user_id', 'dia', 'inicio', 'fin'], 'horarios_por_usuario_y_dia');
        });

        Schema::create('reportes', function (Blueprint $table): void {
            $table->engine('InnoDB');
            $table->id();
            $table->unsignedBigInteger('user_id')->index();
            $table->string('categoria', 20);
            $table->string('asunto', 120);
            $table->text('descripcion');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('reportes');
        Schema::dropIfExists('horarios_disponibles');
    }
};
