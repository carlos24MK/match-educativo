<?php

namespace Tests\Feature;

use App\Models\Perfil;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class HorarioReporteTest extends TestCase
{
    use RefreshDatabase;

    public function test_availability_filters_only_visible_people_with_overlapping_hours_and_complementary_skills(): void
    {
        $propio = User::factory()->create();
        Perfil::factory()->create(['user_id' => $propio->id, 'aprende' => ['Álgebra']]);
        $compatible = Perfil::factory()->create(['visible_en_busqueda' => true, 'ensena' => ['ÁLGEBRA']]);
        $sinCruce = Perfil::factory()->create(['visible_en_busqueda' => true, 'ensena' => ['Álgebra']]);
        $oculto = Perfil::factory()->create(['visible_en_busqueda' => false, 'ensena' => ['Álgebra']]);
        $otroTema = Perfil::factory()->create(['visible_en_busqueda' => true, 'ensena' => ['Historia']]);

        $this->getJson('/api/horarios')->assertUnauthorized();
        $this->actingAs($propio)->get('/horarios')->assertOk();
        $bloque = ['dia' => 1, 'inicio' => '08:00', 'fin' => '10:00'];
        $this->postJson('/api/horarios', ['horarios' => [$bloque]])->assertOk()
            ->assertJsonPath('data.0.inicio', '08:00');
        $this->postJson('/api/horarios', ['horarios' => [$bloque, ['dia' => 1, 'inicio' => '09:00', 'fin' => '11:00']]])
            ->assertUnprocessable()->assertJsonValidationErrors('horarios');
        $this->postJson('/api/horarios', ['horarios' => [['dia' => 1, 'inicio' => '11:00', 'fin' => '09:00']]])
            ->assertUnprocessable()->assertJsonValidationErrors('horarios.0.fin');
        $this->getJson('/api/horarios')->assertJsonCount(1, 'data');
        DB::table('horarios_disponibles')->insert([
            ['user_id' => $compatible->user_id, 'dia' => 1, 'inicio' => '09:00', 'fin' => '11:00'],
            ['user_id' => $sinCruce->user_id, 'dia' => 1, 'inicio' => '10:00', 'fin' => '11:00'],
            ['user_id' => $oculto->user_id, 'dia' => 1, 'inicio' => '09:00', 'fin' => '11:00'],
            ['user_id' => $otroTema->user_id, 'dia' => 1, 'inicio' => '09:00', 'fin' => '11:00'],
        ]);

        $url = '/api/estudiantes?horario_comun=1&habilidades_complementarias=1';
        $this->getJson($url)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $compatible->user_id);
        $this->postJson('/api/horarios', ['horarios' => []])->assertOk()->assertJsonCount(0, 'data');
        $this->getJson($url)->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_reports_are_saved_and_only_their_owner_can_list_them(): void
    {
        $usuario = User::factory()->create();
        $datos = ['categoria' => 'error', 'asunto' => 'Problema en el perfil', 'descripcion' => 'La foto no se actualiza al cambiarla.'];
        $this->postJson('/api/reportes', $datos)->assertUnauthorized();
        $this->actingAs($usuario)->get('/reportes')->assertOk();
        $this->postJson('/api/reportes', ['categoria' => 'otra'])->assertUnprocessable()
            ->assertJsonValidationErrors(['categoria', 'asunto', 'descripcion']);
        $reporte = $this->postJson('/api/reportes', $datos)->assertCreated()->json('id');
        $this->assertDatabaseHas('reportes', ['id' => $reporte, 'user_id' => $usuario->id] + $datos);
        $this->getJson('/api/reportes')->assertOk()->assertJsonPath('data.0.id', $reporte);
        $this->actingAs(User::factory()->create())->getJson('/api/reportes')->assertOk()->assertJsonCount(0, 'data');
    }
}
