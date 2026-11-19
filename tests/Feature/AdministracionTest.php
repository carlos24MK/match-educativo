<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\ReporteAdministrativo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class AdministracionTest extends TestCase
{
    use RefreshDatabase;

    public function test_only_administrators_can_open_the_panel_and_manage_reports(): void
    {
        $this->get('/administracion')->assertRedirect('/login');
        $this->getJson('/api/administracion/reportes')->assertUnauthorized();
        $this->postJson('/api/administracion/reportes/1', ['estado' => 'resuelto'])->assertUnauthorized();

        $usuario = User::factory()->create();
        $this->actingAs($usuario, 'web')->get('/administracion')->assertForbidden();
        $this->getJson('/api/administracion/reportes')->assertForbidden();
        $this->postJson('/api/administracion/reportes/1', ['estado' => 'resuelto'])->assertForbidden();
        $this->getJson('/api/notificaciones')->assertOk()->assertJsonPath('es_admin', false);

        $administrador = User::factory()->create(['rol' => 'admin']);
        Auth::forgetGuards();
        $this->actingAs($administrador, 'web')->get('/administracion')->assertOk()->assertHeader('Cache-Control', 'no-store, private');
        $this->getJson('/api/administracion/reportes')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/notificaciones')->assertOk()->assertJsonPath('es_admin', true);
    }

    public function test_registration_cannot_assign_a_privileged_role(): void
    {
        $correo = 'usuario@example.test';
        $this->postJson('/api/registrar', [
            'name' => 'Administrador falso',
            'email' => $correo,
            'password' => 'contrasena-1234',
            'password_confirmation' => 'contrasena-1234',
            'rol' => 'admin',
        ])->assertCreated();

        $this->assertDatabaseHas('users', ['email' => $correo, 'rol' => 'usuario']);
    }

    public function test_new_reports_notify_only_admins_and_state_changes_are_visible_to_the_reporter(): void
    {
        config(['services.pusher.key' => null]);
        $autor = User::factory()->create();
        $administrador = User::factory()->create(['rol' => 'admin']);
        $otroAdministrador = User::factory()->create(['rol' => 'admin']);
        $descripcion = 'Detalle privado del problema reportado.';

        $this->actingAs($autor, 'web');
        $id = $this->postJson('/api/reportes', [
            'categoria' => 'convivencia',
            'asunto' => 'Conducta inapropiada',
            'descripcion' => $descripcion,
            'estado' => 'resuelto',
            'administrador_id' => $autor->id,
        ])->assertCreated()->json('id');

        $this->assertDatabaseHas('reportes', ['id' => $id, 'estado' => 'pendiente', 'administrador_id' => null]);
        $this->assertDatabaseCount('notifications', 2);
        foreach ([$administrador, $otroAdministrador] as $destinatario) {
            $this->assertDatabaseHas('notifications', [
                'type' => ReporteAdministrativo::class,
                'notifiable_id' => $destinatario->id,
            ]);
        }
        $this->getJson('/api/notificaciones')->assertOk()->assertJsonCount(0, 'data');

        Auth::forgetGuards();
        $this->actingAs($administrador, 'web')->getJson('/api/notificaciones')->assertOk()
            ->assertJsonPath('no_leidas', 1)
            ->assertJsonPath('data.0.tipo', 'reporte_nuevo')
            ->assertJsonPath('data.0.reporte_id', $id)
            ->assertDontSee($descripcion)
            ->assertDontSee($autor->email);
        $this->getJson('/api/administracion/reportes?estado=pendiente&reporte='.$id)->assertOk()
            ->assertJsonPath('data.0.descripcion', $descripcion)
            ->assertJsonPath('data.0.reportado_por.id', $autor->id)
            ->assertJsonPath('data.0.revisado_por', null)
            ->assertJsonPath('resumen.pendiente', 1)
            ->assertJsonPath('resumen.usuarios', 3);

        $ruta = '/api/administracion/reportes/'.$id;
        $this->postJson($ruta, ['estado' => 'desconocido'])->assertUnprocessable();
        $this->postJson($ruta, ['estado' => 'en_revision'])->assertOk()
            ->assertJsonPath('data.revisado_por.id', $administrador->id);
        $this->postJson($ruta, ['estado' => 'pendiente'])->assertConflict();
        $this->postJson($ruta, ['estado' => 'resuelto'])->assertOk()->assertJsonPath('data.estado', 'resuelto');
        $this->getJson('/api/administracion/reportes?estado=pendiente')->assertOk()->assertJsonCount(0, 'data');
        $this->getJson('/api/administracion/reportes?estado=resuelto')->assertOk()
            ->assertJsonPath('data.0.id', $id)
            ->assertJsonPath('resumen.resuelto', 1);

        Auth::forgetGuards();
        $this->actingAs($autor, 'web')->getJson('/api/reportes')->assertOk()
            ->assertJsonPath('data.0.estado', 'resuelto')
            ->assertJsonMissingPath('data.0.administrador_id');

        Auth::forgetGuards();
        $this->actingAs($otroAdministrador, 'web')->postJson($ruta, ['estado' => 'pendiente'])
            ->assertOk()->assertJsonPath('data.estado', 'pendiente');
    }
}
