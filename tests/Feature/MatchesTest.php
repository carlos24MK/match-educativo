<?php

namespace Tests\Feature;

use App\Models\MatchEducativo;
use App\Models\Perfil;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class MatchesTest extends TestCase
{
    use RefreshDatabase;

    public function test_match_requests_require_a_session(): void
    {
        $this->get('/matches')->assertRedirect('/login');
        $this->getJson('/api/matches')->assertUnauthorized();
        $this->postJson('/api/matches', ['estudiante_id' => 1])->assertUnauthorized();
        $this->postJson('/api/matches/1/responder', ['accion' => 'aceptar'])->assertUnauthorized();
    }

    public function test_a_request_requires_a_visible_student_and_cannot_be_duplicated(): void
    {
        $solicitante = User::factory()->create();
        $destinatario = User::factory()->create();
        $perfil = Perfil::factory()->create(['user_id' => $destinatario->id]);
        Perfil::factory()->create(['user_id' => $solicitante->id, 'visible_en_busqueda' => true]);
        $this->como($solicitante);

        $this->postJson('/api/matches', ['estudiante_id' => $solicitante->id])
            ->assertUnprocessable()->assertJsonValidationErrors('estudiante_id');
        $this->postJson('/api/matches', ['estudiante_id' => $destinatario->id])->assertNotFound();
        $perfil->update(['visible_en_busqueda' => true]);

        $datos = ['estudiante_id' => $destinatario->id];
        $this->postJson('/api/matches', $datos)
            ->assertCreated()->assertJsonPath('data.estado', 'pendiente')
            ->assertJsonPath('data.direccion', 'enviada')
            ->assertJsonPath('data.estudiante.id', $destinatario->id)
            ->assertJsonMissingPath('data.estudiante.email');
        $this->postJson('/api/matches', $datos)->assertConflict();

        $this->como($destinatario);
        $this->postJson('/api/matches', ['estudiante_id' => $solicitante->id])->assertConflict();
        $this->getJson('/api/matches?tipo=recibidas')->assertOk()
            ->assertJsonPath('total', 1)->assertJsonPath('data.0.estudiante.id', $solicitante->id);

        $this->assertDatabaseCount('matches', 1);
        $aviso = $destinatario->notifications()->sole();
        $this->assertSame('solicitud_recibida', $aviso->data['tipo']);
        $this->assertSame(MatchEducativo::sole()->id, $aviso->data['match_id']);
    }

    public function test_only_the_receiver_can_accept_a_pending_request(): void
    {
        $solicitud = MatchEducativo::factory()->create();
        $url = "/api/matches/{$solicitud->id}/responder";
        $datos = ['accion' => 'aceptar'];

        $this->como(User::factory()->create())->postJson($url, $datos)->assertNotFound();
        $this->getJson('/api/matches?tipo=recibidas')->assertOk()->assertJsonPath('total', 0);
        $this->como($solicitud->solicitante)->postJson($url, $datos)->assertForbidden();
        $this->getJson('/api/matches?tipo=enviadas')->assertOk()
            ->assertJsonPath('data.0.id', $solicitud->id);

        $this->como($solicitud->destinatario)->postJson($url, $datos)->assertOk()
            ->assertJsonPath('data.estado', 'aceptado')->assertJsonPath('data.direccion', 'recibida');
        $this->postJson($url, $datos)->assertConflict();
        $this->getJson('/api/matches?tipo=conexiones')->assertOk()
            ->assertJsonPath('data.0.id', $solicitud->id);
        $this->getJson('/api/matches?tipo=recibidas')->assertOk()->assertJsonPath('total', 0);

        $aviso = $solicitud->solicitante->notifications()->sole();
        $this->assertSame('solicitud_aceptada', $aviso->data['tipo']);
        $this->assertSame($solicitud->id, $aviso->data['match_id']);
    }

    public function test_canceled_and_rejected_requests_move_to_history(): void
    {
        $solicitud = MatchEducativo::factory()->create();
        $url = "/api/matches/{$solicitud->id}/responder";

        $this->como($solicitud->destinatario)->postJson($url, ['accion' => 'cancelar'])->assertForbidden();
        $this->postJson($url, ['accion' => 'rechazar'])->assertOk()->assertJsonPath('data.estado', 'rechazado');
        $this->getJson('/api/matches?tipo=historial')->assertOk()->assertJsonPath('data.0.id', $solicitud->id);
        $this->assertSame('solicitud_rechazada', $solicitud->solicitante->notifications()->sole()->data['tipo']);

        $otra = MatchEducativo::factory()->create();
        $this->como($otra->solicitante)->postJson("/api/matches/{$otra->id}/responder", ['accion' => 'cancelar'])
            ->assertOk()->assertJsonPath('data.estado', 'cancelado');
        $this->getJson('/api/matches?tipo=historial')->assertOk()->assertJsonPath('data.0.id', $otra->id);
        $this->getJson('/api/matches?tipo=invalido')->assertUnprocessable()->assertJsonValidationErrors('tipo');
    }

    private function como(User $usuario): static
    {
        Auth::forgetGuards();

        return $this->actingAs($usuario, 'web');
    }
}
