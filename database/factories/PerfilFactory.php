<?php

namespace Database\Factories;

use App\Models\Perfil;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Perfil>
 */
class PerfilFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'presentacion' => fake()->sentence(),
            'ensena' => ['Matemáticas'],
            'aprende' => ['Programación'],
        ];
    }
}
