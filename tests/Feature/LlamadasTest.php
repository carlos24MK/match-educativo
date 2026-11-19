<?php

namespace Tests\Feature;

use App\Models\MatchEducativo;
use App\Models\User;
use App\Notifications\TiempoReal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class LlamadasTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config(['services.pusher.key' => null]);
    }

    public function test_calls_require_an_accepted_match_and_are_visible_only_to_its_participants(): void
    {
        $match = MatchEducativo::factory()->create();
        $url = '/api/matches/'.$match->id.'/llamadas';
        $this->getJson('/api/llamadas')->assertUnauthorized();
        $this->postJson($url, ['tipo' => 'video'])->assertUnauthorized();

        $this->entrar($match->solicitante);
        $this->postJson($url, ['tipo' => 'video'])->assertForbidden();
        $match->update(['estado' => 'aceptado']);

        $llamada = $this->postJson($url, ['tipo' => 'video'])
            ->assertCreated()
            ->assertJsonPath('data.tipo', 'video')
            ->assertJsonPath('data.es_iniciador', true)
            ->assertJsonPath('data.estudiante.id', $match->destinatario_id)
            ->assertJsonMissingPath('data.estudiante.email')
            ->json('data.id');

        $this->entrar(User::factory()->create());
        $this->postJson($url, ['tipo' => 'audio'])->assertNotFound();
        $this->getJson('/api/llamadas')->assertOk()->assertJsonPath('data', null);
        $this->getJson('/api/llamadas/'.$llamada)->assertNotFound();
        $this->postJson('/api/llamadas/'.$llamada.'/responder', ['accion' => 'aceptar'])->assertNotFound();
        $this->postJson('/api/llamadas/'.$llamada.'/senales', [
            'tipo' => 'offer', 'datos' => ['sdp' => "v=0\r\n"],
        ])->assertNotFound();

        $this->entrar($match->destinatario);
        $this->getJson('/api/llamadas')->assertOk()
            ->assertJsonPath('data.id', $llamada)
            ->assertJsonPath('data.estado', 'pendiente')
            ->assertJsonPath('data.es_iniciador', false)
            ->assertJsonPath('data.estudiante.id', $match->solicitante_id);

        $match->update(['estado' => 'rechazado']);
        $this->getJson('/api/llamadas/'.$llamada)->assertNotFound();
    }

    public function test_signals_are_private_paginated_by_cursor_and_purged_when_the_call_ends(): void
    {
        $match = MatchEducativo::factory()->create(['estado' => 'aceptado']);
        $tiempoReal = $this->spy(TiempoReal::class);

        $this->entrar($match->solicitante);
        $llamada = $this->postJson('/api/matches/'.$match->id.'/llamadas', ['tipo' => 'audio'])->assertCreated()->json('data.id');
        $url = '/api/llamadas/'.$llamada;
        $oferta = ['tipo' => 'offer', 'datos' => ['sdp' => "v=0\r\ns=Ejemplo\r\n"]];
        $respuesta = ['tipo' => 'answer', 'datos' => ['sdp' => "v=0\r\ns=Respuesta\r\n"]];
        $hielo = ['tipo' => 'ice', 'datos' => ['candidate' => 'candidate:1', 'sdpMid' => '0']];

        $this->postJson($url.'/responder', ['accion' => 'aceptar'])->assertForbidden();
        $this->postJson($url.'/senales', $oferta)->assertConflict();

        $this->entrar($match->destinatario);
        $this->postJson($url.'/responder', ['accion' => 'aceptar'])->assertOk()->assertJsonPath('data.estado', 'aceptada');
        $this->postJson($url.'/senales', $oferta)->assertForbidden();
        $this->postJson($url.'/senales', $respuesta)->assertConflict();

        $this->entrar($match->solicitante);
        $ofertaId = $this->postJson($url.'/senales', $oferta)->assertCreated()->json('id');
        $hieloId = $this->postJson($url.'/senales', $hielo)->assertCreated()->json('id');
        $this->getJson($url)->assertOk()->assertJsonCount(0, 'senales');

        $this->entrar($match->destinatario);
        $this->getJson($url)->assertOk()->assertJsonCount(2, 'senales')
            ->assertJsonPath('senales.0.id', $ofertaId)
            ->assertJsonPath('senales.0.datos.sdp', $oferta['datos']['sdp'])
            ->assertJsonPath('senales.1.id', $hieloId);
        $this->getJson($url.'?despues='.$ofertaId)->assertOk()->assertJsonCount(1, 'senales')
            ->assertJsonPath('senales.0.tipo', 'ice');
        $this->postJson($url.'/senales', $respuesta)->assertCreated();

        $this->entrar($match->solicitante);
        $this->getJson($url)->assertOk()->assertJsonCount(1, 'senales')->assertJsonPath('senales.0.tipo', 'answer');

        $this->entrar($match->destinatario);
        $this->postJson($url.'/responder', ['accion' => 'terminar'])->assertOk()->assertJsonPath('data.estado', 'terminada');
        $this->getJson($url)->assertOk()->assertJsonCount(0, 'senales');
        $this->assertDatabaseCount('llamada_senales', 0);
        $aviso = ['llamada_id' => $llamada, 'match_id' => $match->id];
        $tiempoReal->shouldHaveReceived('publicar')->with($match->destinatario_id, 'llamada', $aviso)->twice();
        $tiempoReal->shouldHaveReceived('publicar')->with($match->solicitante_id, 'llamada', $aviso)->times(3);
    }

    public function test_competing_call_attempts_expiry_and_rejection_release_the_participants(): void
    {
        $match = MatchEducativo::factory()->create(['estado' => 'aceptado']);
        $otroMatch = MatchEducativo::factory()->create([
            'estado' => 'aceptado',
            'solicitante_id' => $match->destinatario_id,
        ]);
        $this->entrar($match->solicitante);

        $inicio = '/api/matches/'.$match->id.'/llamadas';
        $inicioOtro = '/api/matches/'.$otroMatch->id.'/llamadas';
        $llamada = $this->postJson($inicio, ['tipo' => 'audio'])->assertCreated()->json('data.id');
        $this->postJson($inicio, ['tipo' => 'video'])->assertConflict();

        $this->entrar($otroMatch->destinatario);
        $this->postJson($inicioOtro, ['tipo' => 'video'])->assertConflict();

        $this->travel(46)->seconds();
        $nueva = $this->postJson($inicioOtro, ['tipo' => 'video'])->assertCreated()->json('data.id');

        $this->entrar($match->destinatario);
        $this->getJson('/api/llamadas/'.$llamada)->assertOk()->assertJsonPath('data.estado', 'expirada');
        $this->postJson('/api/llamadas/'.$llamada.'/responder', ['accion' => 'aceptar'])->assertConflict();
        $this->postJson('/api/llamadas/'.$nueva.'/responder', ['accion' => 'rechazar'])
            ->assertOk()->assertJsonPath('data.estado', 'rechazada');
        $this->postJson($inicio, ['tipo' => 'audio'])->assertCreated();
    }

    public function test_signal_validation_limits_the_payload(): void
    {
        $match = MatchEducativo::factory()->create(['estado' => 'aceptado']);
        $inicio = '/api/matches/'.$match->id.'/llamadas';
        $this->entrar($match->solicitante);
        $this->postJson($inicio, ['tipo' => 'texto'])->assertUnprocessable()->assertJsonValidationErrors('tipo');
        $llamada = $this->postJson($inicio, ['tipo' => 'audio'])->assertCreated()->json('data.id');
        $url = '/api/llamadas/'.$llamada;

        $this->entrar($match->destinatario);
        $this->postJson($url.'/responder', ['accion' => 'aceptar'])->assertOk();
        $this->entrar($match->solicitante);
        $this->postJson($url.'/senales', [
            'tipo' => 'offer',
            'datos' => ['sdp' => 'v=0'.str_repeat('a', 12_000)],
        ])->assertUnprocessable()->assertJsonValidationErrors('datos.sdp');
        $this->postJson($url.'/senales', [
            'tipo' => 'offer',
            'datos' => ['sdp' => 'v=0', 'campo_extra' => true],
        ])->assertUnprocessable()->assertJsonValidationErrors('datos');
        $this->postJson($url.'/senales', [
            'tipo' => 'ice',
            'datos' => ['candidate' => 'candidate:1'],
        ])->assertUnprocessable()->assertJsonValidationErrors(['datos.sdpMid', 'datos.sdpMLineIndex']);
    }

    public function test_turn_credentials_are_temporary_and_only_available_during_an_active_call(): void
    {
        config([
            'services.turn.urls' => 'turn:relay.example.com:3478, turns:relay.example.com:5349',
            'services.turn.secret' => 'example-test-secret',
        ]);

        $match = MatchEducativo::factory()->create(['estado' => 'aceptado']);
        $this->entrar($match->solicitante);
        $llamada = $this->postJson('/api/matches/'.$match->id.'/llamadas', ['tipo' => 'video'])
            ->assertCreated()->assertJsonPath('ice_servers', [])->json('data.id');
        $url = '/api/llamadas/'.$llamada;

        $this->entrar($match->destinatario);
        $this->freezeTime();
        $username = now()->addHours(2)->timestamp.':'.$match->destinatario_id;
        $this->postJson($url.'/responder', ['accion' => 'aceptar'])
            ->assertOk()
            ->assertJsonPath('ice_servers.0.urls', ['turn:relay.example.com:3478', 'turns:relay.example.com:5349'])
            ->assertJsonPath('ice_servers.0.username', $username)
            ->assertJsonPath('ice_servers.0.credential', base64_encode(hash_hmac('sha1', $username, 'example-test-secret', true)))
            ->assertDontSee('example-test-secret');

        $this->travel(121)->minutes();
        $this->getJson($url)->assertOk()->assertJsonPath('data.estado', 'expirada')->assertJsonPath('ice_servers', []);
    }

    private function entrar(User $usuario): void
    {
        Auth::forgetGuards();
        $this->actingAs($usuario, 'web');
    }
}
