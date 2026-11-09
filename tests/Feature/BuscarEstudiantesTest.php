<?php

namespace Tests\Feature;

use App\Models\Perfil;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BuscarEstudiantesTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_signed_in_users_can_search(): void
    {
        $this->get('/buscar-estudiantes')->assertRedirect('/login');
        $this->getJson('/api/estudiantes')->assertUnauthorized();
    }

    public function test_search_respects_visibility_ownership_and_skill_direction(): void
    {
        $usuario = User::factory()->create();
        Perfil::factory()->create(['user_id' => $usuario->id, 'visible_en_busqueda' => true]);
        Perfil::factory()->create(['ensena' => ['Matemáticas']]);
        $docente = Perfil::factory()->create(['visible_en_busqueda' => true, 'ensena' => ['Matemáticas']]);
        $aprendiz = Perfil::factory()->create([
            'visible_en_busqueda' => true,
            'ensena' => ['Álgebra'],
            'aprende' => ['Matemáticas'],
        ]);

        $this->actingAs($usuario, 'web');
        $this->getJson('/api/estudiantes')
            ->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('total', 2);

        $habilidad = rawurlencode('Matemáticas');
        $this->getJson('/api/estudiantes?habilidad='.$habilidad)
            ->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $docente->user_id)
            ->assertJsonMissingPath('data.0.email')
            ->assertJsonMissingPath('data.0.password')
            ->assertJsonMissingPath('data.0.visible_en_busqueda');

        $this->getJson('/api/estudiantes?habilidad='.$habilidad.'&tipo=aprende')
            ->assertOk()->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $aprendiz->user_id);

        $this->getJson('/api/estudiantes?tipo=incorrecto&page=0')
            ->assertUnprocessable()->assertJsonValidationErrors(['tipo', 'page']);
    }

    public function test_search_has_bounded_pages(): void
    {
        Perfil::factory()->count(10)->create(['visible_en_busqueda' => true]);

        $this->actingAs(User::factory()->create(), 'web')->getJson('/api/estudiantes?page=2')
            ->assertOk()->assertJsonPath('total', 10)
            ->assertJsonPath('current_page', 2)->assertJsonPath('last_page', 2)
            ->assertJsonCount(1, 'data');
    }

    public function test_directory_search_combines_partial_names_and_skills_without_exposing_hidden_profiles(): void
    {
        $usuario = User::factory()->create(['name' => 'ÁNGELA Propia']);
        Perfil::factory()->create(['user_id' => $usuario->id, 'visible_en_busqueda' => true]);
        Perfil::factory()->create(['user_id' => User::factory()->state(['name' => 'ÁNGELA Privada'])]);
        $docente = Perfil::factory()->create([
            'user_id' => User::factory()->state(['name' => 'Andrés']),
            'visible_en_busqueda' => true,
            'ensena' => ['Álgebra'],
            'aprende' => [],
        ]);
        $aprendiz = Perfil::factory()->create([
            'user_id' => User::factory()->state(['name' => 'ÁNGELA Rojas']),
            'visible_en_busqueda' => true,
            'ensena' => [],
            'aprende' => ['Álgebra'],
        ]);
        $this->actingAs($usuario, 'web');

        $this->getJson('/api/estudiantes?tipo=todos&buscar='.rawurlencode('álg'))
            ->assertOk()->assertJsonPath('total', 2);
        $this->getJson('/api/estudiantes?tipo=ensena&buscar='.rawurlencode('álg'))
            ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $docente->user_id);
        $this->getJson('/api/estudiantes?tipo=todos&buscar='.rawurlencode('ángela'))
            ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $aprendiz->user_id)
            ->assertJsonMissingPath('data.0.email');
        $this->getJson('/api/estudiantes?tipo=ensena&buscar='.rawurlencode('ángela'))
            ->assertOk()->assertJsonPath('total', 0);
        $this->getJson('/api/estudiantes?tipo=aprende&buscar=')
            ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $aprendiz->user_id);
    }

    public function test_directory_treats_percent_and_underscore_as_literal_characters(): void
    {
        Perfil::factory()->create(['visible_en_busqueda' => true, 'ensena' => ['Excel']]);
        $perfil = Perfil::factory()->create(['visible_en_busqueda' => true, 'aprende' => ['Usar 50%_ en hojas de cálculo']]);

        $this->actingAs(User::factory()->create(), 'web');
        $this->getJson('/api/estudiantes?tipo=todos&buscar='.rawurlencode('%_'))
            ->assertOk()->assertJsonPath('total', 1)->assertJsonPath('data.0.id', $perfil->user_id);
    }
}
