<?php

namespace Tests\Feature;

use App\Models\User;
use App\Notifications\CodigoRecuperacionCorreo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class RecuperacionPorCorreoTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_code_is_private_bound_to_the_recipient_and_single_use(): void
    {
        config(['mail.default' => 'array']);
        Notification::fake();
        $usuario = User::factory()->create();
        $otro = User::factory()->create();
        $respuesta = $this->postJson('/api/solicitar-codigo-recuperacion', ['email' => $usuario->email])->assertOk();
        $notificacion = Notification::sent($usuario, CodigoRecuperacionCorreo::class)->sole();
        $codigo = $notificacion->codigo;

        $this->assertMatchesRegularExpression('/\A[A-F0-9]{4}(?:-[A-F0-9]{4}){2}\z/', $codigo);
        $respuesta->assertDontSee($codigo);
        $this->assertNotSame($codigo, DB::table('password_reset_tokens')->where('email', $usuario->email)->value('token'));
        $this->assertStringContainsString($codigo, implode(' ', $notificacion->toMail($usuario)->introLines));
        Notification::assertNotSentTo($otro, CodigoRecuperacionCorreo::class);

        $this->recuperar($otro, $codigo)->assertUnprocessable()->assertJsonValidationErrors('recovery_code');
        $this->recuperar($usuario, strtolower($codigo))->assertOk();
        $this->assertTrue(Hash::check('MiNuevaClaveSegura7!', $usuario->fresh()->password));
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $usuario->email]);
        $this->recuperar($usuario, $codigo)->assertUnprocessable()->assertJsonValidationErrors('recovery_code');
    }

    public function test_email_code_expires_and_requests_do_not_reveal_registered_addresses(): void
    {
        config(['mail.default' => 'array']);
        Notification::fake();
        $usuario = User::factory()->create();
        $respuestaReal = $this->postJson('/api/solicitar-codigo-recuperacion', ['email' => $usuario->email])->assertOk()->json();
        $this->postJson('/api/solicitar-codigo-recuperacion', ['email' => 'sin-cuenta@example.test'])
            ->assertOk()->assertExactJson($respuestaReal);
        $this->postJson('/api/solicitar-codigo-recuperacion', ['email' => $usuario->email])
            ->assertOk()->assertExactJson($respuestaReal);
        Notification::assertSentToTimes($usuario, CodigoRecuperacionCorreo::class, 1);

        $codigo = Notification::sent($usuario, CodigoRecuperacionCorreo::class)->sole()->codigo;
        $this->travel(CodigoRecuperacionCorreo::Minutos)->minutes();
        $this->recuperar($usuario, $codigo)->assertUnprocessable()->assertJsonValidationErrors('recovery_code');
        $this->assertTrue(Hash::check('password', $usuario->fresh()->password));
    }

    public function test_log_transport_never_receives_a_recovery_secret(): void
    {
        config(['mail.default' => 'log']);
        Notification::fake();
        $usuario = User::factory()->create();
        $this->postJson('/api/solicitar-codigo-recuperacion', ['email' => $usuario->email])->assertServiceUnavailable();
        $this->assertDatabaseCount('password_reset_tokens', 0);
        Notification::assertNothingSent();
    }

    private function recuperar(User $usuario, string $codigo): TestResponse
    {
        return $this->postJson('/api/recuperar-contrasena', [
            'email' => $usuario->email,
            'recovery_code' => $codigo,
            'password' => 'MiNuevaClaveSegura7!',
            'password_confirmation' => 'MiNuevaClaveSegura7!',
        ]);
    }
}
