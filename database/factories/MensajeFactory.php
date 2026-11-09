<?php

namespace Database\Factories;

use App\Models\MatchEducativo;
use App\Models\Mensaje;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Mensaje>
 */
class MensajeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'match_id' => MatchEducativo::factory()->state(['estado' => 'aceptado']),
            'remitente_id' => fn (array $atributos): int => (int) MatchEducativo::query()
                ->findOrFail($atributos['match_id'])->solicitante_id,
            'contenido' => fake()->sentence(),
        ];
    }
}
