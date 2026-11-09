<?php

namespace Database\Factories;

use App\Models\MatchEducativo;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<MatchEducativo>
 */
class MatchEducativoFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'solicitante_id' => User::factory(),
            'destinatario_id' => User::factory(),
            'pareja' => fn (array $datos): string => MatchEducativo::clavePareja(
                $datos['solicitante_id'],
                $datos['destinatario_id'],
            ),
            'estado' => 'pendiente',
        ];
    }
}
