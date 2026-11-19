<?php

namespace Tests\Feature;

use App\Models\MatchEducativo;
use App\Models\Perfil;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class AvisosCorreoTest extends TestCase
{
    use RefreshDatabase;

    public function test_match_request_and_acceptance_notify_the_other_account_once(): void
    {
        config(['mail.default' => 'array']);
        $solicitante = User::factory()->create();
        $destinatario = User::factory()->create();
        Perfil::factory()->create(['user_id' => $destinatario->id, 'visible_en_busqueda' => true]);

        $datos = ['estudiante_id' => $destinatario->id];
        $this->actingAs($solicitante, 'web')->postJson('/api/matches', $datos)->assertCreated();
        $this->postJson('/api/matches', $datos)->assertConflict();

        $url = '/api/matches/'.MatchEducativo::sole()->id.'/responder';
        Auth::forgetGuards();
        $this->actingAs($destinatario, 'web')->postJson($url, ['accion' => 'aceptar'])->assertOk();
        $this->postJson($url, ['accion' => 'aceptar'])->assertConflict();

        $correos = Mail::mailer('array')->getSymfonyTransport()->messages();
        $this->assertCount(2, $correos);
        $this->assertSame($destinatario->email, $correos[0]->getEnvelope()->getRecipients()[0]->getAddress());
        $this->assertSame($solicitante->email, $correos[1]->getEnvelope()->getRecipients()[0]->getAddress());
        $this->assertStringContainsString('Nueva solicitud', $correos[0]->getOriginalMessage()->getSubject());
        $this->assertStringContainsString('Aceptaron tu solicitud', $correos[1]->getOriginalMessage()->getSubject());
        $this->assertStringContainsString('/matches?tipo=recibidas', $correos[0]->getOriginalMessage()->getHtmlBody());
        $this->assertStringContainsString('/matches?tipo=conexiones', $correos[1]->getOriginalMessage()->getHtmlBody());
    }

    public function test_match_rejection_notifies_the_requester_only_once(): void
    {
        config(['mail.default' => 'array']);
        $solicitante = User::factory()->create();
        $destinatario = User::factory()->create();
        Perfil::factory()->create(['user_id' => $destinatario->id, 'visible_en_busqueda' => true]);
        $this->actingAs($solicitante, 'web')
            ->postJson('/api/matches', ['estudiante_id' => $destinatario->id])->assertCreated();
        $url = '/api/matches/'.MatchEducativo::sole()->id.'/responder';

        Auth::forgetGuards();
        $this->actingAs($destinatario, 'web')->postJson($url, ['accion' => 'rechazar'])->assertOk();
        $this->postJson($url, ['accion' => 'rechazar'])->assertConflict();

        $correos = Mail::mailer('array')->getSymfonyTransport()->messages();
        $this->assertCount(2, $correos);
        $this->assertSame($solicitante->email, $correos[1]->getEnvelope()->getRecipients()[0]->getAddress());
        $this->assertStringContainsString('/matches?tipo=historial', $correos[1]->getOriginalMessage()->getHtmlBody());
    }

    public function test_new_report_emails_only_administrators_without_disclosing_report_data(): void
    {
        config(['mail.default' => 'array']);
        $autor = User::factory()->create();
        $administradores = User::factory()->count(2)->create(['rol' => 'admin']);
        $datos = [
            'categoria' => 'convivencia',
            'asunto' => 'Asunto confidencial del reporte',
            'descripcion' => 'Descripción confidencial que solo debe verse al entrar al panel.',
        ];

        $id = $this->actingAs($autor, 'web')->postJson('/api/reportes', $datos)->assertCreated()->json('id');

        $correos = Mail::mailer('array')->getSymfonyTransport()->messages();
        $this->assertCount(2, $correos);
        foreach ($correos as $indice => $correo) {
            $this->assertSame($administradores[$indice]->email, $correo->getEnvelope()->getRecipients()[0]->getAddress());
            $mensaje = $correo->getOriginalMessage();
            $this->assertStringContainsString('/administracion?reporte='.$id, $mensaje->getHtmlBody());
            foreach ([$datos['asunto'], $datos['descripcion'], $autor->name, $autor->email] as $dato) {
                $this->assertStringNotContainsString($dato, $mensaje->getHtmlBody());
                $this->assertStringNotContainsString($dato, $mensaje->getTextBody());
            }
        }
    }

    public function test_recovery_alerts_go_to_the_account_without_codes_or_passwords(): void
    {
        config(['mail.default' => 'array']);
        $usuario = User::factory()->create();
        $codigos = $this->actingAs($usuario, 'web')->withHeaders(['Origin' => 'http://localhost'])
            ->postJson('/api/recovery-codes', ['password' => 'password'])
            ->assertOk()->json('data.recovery_codes');

        $clave = 'NuevaClaveSegura123!';
        $datos = [
            'email' => $usuario->email,
            'recovery_code' => $codigos[0],
            'password' => $clave,
            'password_confirmation' => $clave,
        ];
        $this->postJson('/api/recuperar-contrasena', $datos)->assertOk();
        $this->postJson('/api/recuperar-contrasena', $datos)->assertUnprocessable();

        $correos = Mail::mailer('array')->getSymfonyTransport()->messages();
        $this->assertCount(2, $correos);
        $this->assertStringContainsString('Se generaron códigos', $correos[0]->getOriginalMessage()->getSubject());
        $this->assertStringContainsString('Se recuperó tu contraseña', $correos[1]->getOriginalMessage()->getSubject());
        foreach ($correos as $correo) {
            $this->assertSame($usuario->email, $correo->getEnvelope()->getRecipients()[0]->getAddress());
            $mensaje = $correo->getOriginalMessage();
            foreach ([...$codigos, $clave] as $secreto) {
                $this->assertStringNotContainsString($secreto, $mensaje->getTextBody());
                $this->assertStringNotContainsString($secreto, $mensaje->getHtmlBody());
            }
        }
    }

    public function test_unavailable_mail_does_not_break_match_requests(): void
    {
        config(['mail.default' => 'no-disponible']);
        $solicitante = User::factory()->create();
        $destinatario = User::factory()->create();
        Perfil::factory()->create(['user_id' => $destinatario->id, 'visible_en_busqueda' => true]);

        $this->actingAs($solicitante, 'web')
            ->postJson('/api/matches', ['estudiante_id' => $destinatario->id])
            ->assertCreated();

        $this->assertDatabaseHas('matches', [
            'solicitante_id' => $solicitante->id,
            'destinatario_id' => $destinatario->id,
        ]);
        $this->assertSame('solicitud_recibida', $destinatario->notifications()->sole()->data['tipo']);
    }

    public function test_unavailable_mail_preserves_the_report_and_its_in_app_notice(): void
    {
        config(['mail.default' => 'no-disponible']);
        $autor = User::factory()->create();
        $administrador = User::factory()->create(['rol' => 'admin']);
        $id = $this->actingAs($autor, 'web')->postJson('/api/reportes', [
            'categoria' => 'error',
            'asunto' => 'Problema en una pantalla',
            'descripcion' => 'La pantalla no carga al enviar el formulario.',
        ])->assertCreated()->json('id');

        $this->assertDatabaseHas('reportes', ['id' => $id, 'user_id' => $autor->id]);
        $this->assertSame($id, $administrador->notifications()->sole()->data['reporte_id']);
    }
}
