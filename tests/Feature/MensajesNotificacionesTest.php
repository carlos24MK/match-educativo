<?php

namespace Tests\Feature;

use App\Models\MatchEducativo;
use App\Models\Mensaje;
use App\Models\User;
use App\Notifications\ActividadMatch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class MensajesNotificacionesTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_access_messages_or_notifications(): void
    {
        $this->getJson('/api/matches/1/mensajes')->assertUnauthorized();
        $this->postJson('/api/matches/1/mensajes', ['contenido' => 'Hola'])->assertUnauthorized();
        $this->getJson('/api/notificaciones')->assertUnauthorized();
        $this->postJson('/api/notificaciones/leer-todas')->assertUnauthorized();
    }

    public function test_only_participants_of_an_accepted_match_can_read_or_send(): void
    {
        $match = MatchEducativo::factory()->create(['estado' => 'pendiente']);
        $url = '/api/matches/'.$match->id.'/mensajes';

        $this->actingAs($match->solicitante, 'web')->getJson($url)->assertForbidden();
        $this->postJson($url, ['contenido' => 'Hola'])->assertForbidden();
        $match->update(['estado' => 'aceptado']);

        Auth::forgetGuards();
        $this->actingAs(User::factory()->create(), 'web')->getJson($url)->assertNotFound();
        $this->postJson($url, ['contenido' => 'Hola'])->assertNotFound();
        $this->assertDatabaseCount('mensajes', 0);
    }

    public function test_sending_a_message_creates_a_private_notification_for_the_recipient(): void
    {
        $match = MatchEducativo::factory()->create(['estado' => 'aceptado']);
        $url = '/api/matches/'.$match->id.'/mensajes';
        $contenido = 'Mi horario privado es el martes.';

        $this->actingAs($match->solicitante, 'web')
            ->postJson($url, ['contenido' => '   '])
            ->assertUnprocessable()->assertJsonValidationErrors('contenido');
        $this->postJson($url, ['contenido' => str_repeat('a', 2001)])
            ->assertUnprocessable()->assertJsonValidationErrors('contenido');
        $this->assertDatabaseCount('mensajes', 0);
        $this->assertDatabaseCount('notifications', 0);

        $respuesta = $this->postJson($url, ['contenido' => '  '.$contenido.'  '])
            ->assertCreated()->assertJsonPath('data.contenido', $contenido)
            ->assertJsonPath('data.es_mio', true)
            ->assertJsonStructure(['data' => ['id', 'creado_en']]);
        $this->getJson('/api/notificaciones')->assertJsonCount(0, 'data');

        Auth::forgetGuards();
        $this->actingAs($match->destinatario, 'web')->getJson($url)
            ->assertOk()->assertJsonPath('estudiante.id', $match->solicitante_id)
            ->assertJsonPath('data.0.id', $respuesta->json('data.id'))
            ->assertJsonPath('data.0.contenido', $contenido)->assertJsonPath('data.0.es_mio', false);
        $this->getJson('/api/notificaciones')->assertOk()
            ->assertJsonPath('no_leidas', 1)
            ->assertJsonPath('data.0.tipo', 'mensaje_recibido')
            ->assertJsonPath('data.0.match_id', $match->id)
            ->assertJsonPath('data.0.leida', false)
            ->assertDontSee($contenido);
    }

    public function test_history_is_scoped_and_paged_in_chronological_order(): void
    {
        $match = MatchEducativo::factory()->create(['estado' => 'aceptado']);
        $mensajes = Mensaje::factory()->count(42)->create(['match_id' => $match->id]);
        Mensaje::factory()->create();
        $url = '/api/matches/'.$match->id.'/mensajes';

        $this->actingAs($match->solicitante, 'web')->getJson($url)
            ->assertOk()->assertJsonCount(40, 'data')
            ->assertJsonPath('hay_anteriores', true)
            ->assertJsonPath('data.0.id', $mensajes[2]->id)
            ->assertJsonPath('data.39.id', $mensajes[41]->id);
        $this->getJson($url.'?antes='.$mensajes[2]->id)
            ->assertOk()->assertJsonCount(2, 'data')
            ->assertJsonPath('hay_anteriores', false)
            ->assertJsonPath('data.0.id', $mensajes[0]->id)
            ->assertJsonPath('data.1.id', $mensajes[1]->id);
    }

    public function test_notifications_can_only_be_marked_by_their_owner(): void
    {
        $match = MatchEducativo::factory()->create(['estado' => 'aceptado']);
        $dueno = $match->solicitante;
        $otro = $match->destinatario;
        $dueno->notify(new ActividadMatch('solicitud_aceptada', $otro->name, $match->id));
        $dueno->notify(new ActividadMatch('mensaje_recibido', $otro->name, $match->id));
        $otro->notify(new ActividadMatch('mensaje_recibido', $dueno->name, $match->id));
        $propia = $dueno->notifications()->firstOrFail();
        $ajena = $otro->notifications()->firstOrFail();
        $url = '/api/notificaciones/';

        $this->actingAs($dueno, 'web')->getJson('/api/notificaciones')
            ->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('no_leidas', 2)
            ->assertJsonMissing(['id' => $ajena->id]);

        $this->postJson($url.$ajena->id.'/leer')->assertNotFound();
        $this->postJson($url.$propia->id.'/leer')->assertOk()->assertJsonPath('no_leidas', 1);
        $this->postJson($url.$propia->id.'/leer')->assertOk()->assertJsonPath('no_leidas', 1);
        $this->postJson($url.'leer-todas')->assertOk()->assertJsonPath('no_leidas', 0);
        $this->assertNotNull($propia->fresh()->read_at);
        $this->assertNull($ajena->fresh()->read_at);
    }
}
