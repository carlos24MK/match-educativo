<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CambiarContrasenaTest extends TestCase
{
    use RefreshDatabase;

    public function test_password_change_requires_the_current_password_and_revokes_sessions(): void
    {
        $usuario = User::factory()->create();
        $otro = User::factory()->create();
        DB::table('sessions')->insert([
            ['id' => 'sesion-propia', 'user_id' => $usuario->id, 'payload' => '', 'last_activity' => now()->timestamp],
            ['id' => 'sesion-ajena', 'user_id' => $otro->id, 'payload' => '', 'last_activity' => now()->timestamp],
        ]);

        $datos = [
            'current_password' => 'incorrecta',
            'password' => 'NuevaClaveSegura123!',
            'password_confirmation' => 'NuevaClaveSegura123!',
        ];

        $this->postJson('/api/configuracion/contrasena', $datos)->assertUnauthorized();
        $this->withHeaders(['Origin' => 'http://localhost'])
            ->postJson('/api/login', ['email' => $usuario->email, 'password' => 'password'])->assertOk();
        $this->postJson('/api/configuracion/contrasena', $datos)
            ->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $this->assertTrue(Hash::check('password', $usuario->fresh()->password));

        $datos['current_password'] = 'password';
        $this->postJson('/api/configuracion/contrasena', $datos)->assertOk();
        $this->assertTrue(Hash::check($datos['password'], $usuario->fresh()->password));
        $this->assertDatabaseMissing('sessions', ['id' => 'sesion-propia']);
        $this->assertDatabaseHas('sessions', ['id' => 'sesion-ajena']);

        Auth::forgetGuards();
        $this->getJson('/api/user')->assertUnauthorized();
        $this->postJson('/api/login', ['email' => $usuario->email, 'password' => $datos['password']])->assertOk();
    }
}
