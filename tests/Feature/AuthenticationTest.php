<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_saves_a_hashed_password_and_rejects_duplicates(): void
    {
        $datos = ['name' => 'Carlos', 'email' => 'carlos@example.com', 'password' => 'ClaveSegura123!', 'password_confirmation' => 'ClaveSegura123!'];

        $this->postJson('/api/registrar', $datos)->assertCreated()->assertJsonMissingPath('data.user.password');
        $usuario = User::where('email', $datos['email'])->firstOrFail();
        $this->assertTrue(Hash::check($datos['password'], $usuario->password));
        $this->postJson('/api/registrar', $datos)->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->assertDatabaseCount('users', 1);
    }

    public function test_registration_rejects_password_confirmation_and_bcrypt_truncation(): void
    {
        $datos = ['name' => 'Carlos', 'email' => 'carlos@example.com', 'password' => 'ClaveSegura123!', 'password_confirmation' => 'OtraClave123!'];
        $this->postJson('/api/registrar', $datos)->assertUnprocessable()->assertJsonValidationErrors('password');

        $datos['password'] = $datos['password_confirmation'] = str_repeat('á', 40);
        $this->postJson('/api/registrar', $datos)->assertUnprocessable()->assertJsonValidationErrors('password');
        $this->assertDatabaseCount('users', 0);
    }

    public function test_guests_cannot_access_private_pages_or_codes(): void
    {
        $this->get('/dashboard')->assertRedirect('/login');
        $this->get('/configuracion/seguridad')->assertRedirect('/login');
        $this->getJson('/api/user')->assertUnauthorized();
        $this->getJson('/api/recovery-codes')->assertUnauthorized();
        $this->postJson('/api/recovery-codes', ['password' => 'password'])->assertUnauthorized();
    }

    public function test_login_and_logout_manage_the_session(): void
    {
        $usuario = User::factory()->create();
        $this->withHeaders(['Origin' => 'http://localhost'])
            ->postJson('/api/login', ['email' => $usuario->email, 'password' => 'password'])
            ->assertOk()->assertJsonPath('data.user.id', $usuario->id)->assertJsonMissingPath('data.user.password');
        $this->assertAuthenticatedAs($usuario, 'web');
        $this->getJson('/api/user')->assertOk();
        $this->postJson('/api/logout')->assertOk();
        Auth::forgetGuards();
        $this->getJson('/api/user')->assertUnauthorized();
        $this->get('/dashboard')->assertRedirect('/login');
    }

    public function test_invalid_login_and_rate_limit(): void
    {
        $usuario = User::factory()->create();
        $this->withHeaders(['Origin' => 'http://localhost']);
        for ($intento = 0; $intento < 5; $intento++) {
            $this->postJson('/api/login', ['email' => $usuario->email, 'password' => 'incorrecta'])
                ->assertUnprocessable()->assertJsonValidationErrors('email');
        }
        $this->postJson('/api/login', ['email' => $usuario->email, 'password' => 'incorrecta'])->assertTooManyRequests();
        $this->assertGuest('web');
    }

    public function test_public_form_has_security_headers(): void
    {
        $respuesta = $this->get('/recuperar-contrasena')->assertOk()
            ->assertHeader('X-Content-Type-Options', 'nosniff')
            ->assertHeader('X-Frame-Options', 'DENY');
        $this->assertStringContainsString("frame-ancestors 'none'", $respuesta->headers->get('Content-Security-Policy'));
        $this->assertStringContainsString('no-store', $respuesta->headers->get('Cache-Control'));
    }

    public function test_stateful_post_requires_csrf_outside_the_testing_bypass(): void
    {
        $this->app->instance('env', 'production');
        try {
            $this->withHeaders(['Origin' => 'http://localhost'])
                ->postJson('/api/login', ['email' => 'carlos@example.com', 'password' => 'password'])
                ->assertStatus(419);
        } finally {
            $this->app->instance('env', 'testing');
        }
    }
}
