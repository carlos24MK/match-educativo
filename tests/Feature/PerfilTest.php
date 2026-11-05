<?php

namespace Tests\Feature;

use App\Models\Perfil;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PerfilTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_requires_a_session(): void
    {
        $this->get('/perfil')->assertRedirect('/login');
        $this->getJson('/api/perfil')->assertUnauthorized();
        $this->postJson('/api/perfil')->assertUnauthorized();
    }

    public function test_student_can_save_and_update_only_their_profile(): void
    {
        $otro = Perfil::factory()->create();
        $usuario = User::factory()->create();
        $this->actingAs($usuario, 'web');

        $this->getJson('/api/perfil')->assertOk()->assertExactJson([
            'presentacion' => '', 'ensena' => [], 'aprende' => [],
        ]);

        $datos = [
            'presentacion' => 'Busco compañeros para estudiar.',
            'ensena' => ['Matemáticas'],
            'aprende' => ['JavaScript'],
        ];
        $this->postJson('/api/perfil', $datos + ['user_id' => $otro->user_id])
            ->assertOk()->assertExactJson($datos);
        $this->getJson('/api/perfil')->assertOk()->assertExactJson($datos);

        $datos['ensena'] = [];
        $this->postJson('/api/perfil', $datos)->assertOk()->assertExactJson($datos);

        $this->assertDatabaseCount('perfiles', 2);
        $this->assertSame(['Matemáticas'], $otro->fresh()->ensena);
        $this->assertSame([], Perfil::where('user_id', $usuario->id)->firstOrFail()->ensena);
    }

    public function test_invalid_skills_do_not_create_a_profile(): void
    {
        $this->actingAs(User::factory()->create(), 'web')
            ->postJson('/api/perfil', [
                'presentacion' => str_repeat('a', 501),
                'ensena' => ['React', 'react'],
                'aprende' => [str_repeat('a', 61)],
            ])->assertUnprocessable()->assertJsonValidationErrors(['presentacion', 'ensena.0', 'aprende.0']);

        $this->assertDatabaseCount('perfiles', 0);
    }
}
