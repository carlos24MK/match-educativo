<?php

namespace Tests\Feature;

use App\Models\RecoveryCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class RecoveryCodesTest extends TestCase
{
    use RefreshDatabase;

    private function generar(User $usuario): array
    {
        Auth::forgetGuards();
        Auth::shouldUse('web');
        session()->flush();

        return $this->actingAs($usuario, 'web')->withHeaders(['Origin' => 'http://localhost'])
            ->postJson('/api/recovery-codes', ['password' => 'password'])
            ->assertOk()->json('data.recovery_codes');
    }

    private function datos(User $usuario, string $codigo): array
    {
        return ['email' => $usuario->email, 'recovery_code' => $codigo, 'password' => 'NuevaClave123!', 'password_confirmation' => 'NuevaClave123!'];
    }

    public function test_generation_creates_exactly_six_distinct_hashed_codes(): void
    {
        $usuario = User::factory()->create();
        $codigos = $this->generar($usuario);
        $this->assertCount(6, $codigos);
        $this->assertCount(6, array_unique($codigos));
        $guardados = RecoveryCode::where('user_id', $usuario->id)->get();
        $this->assertCount(6, $guardados);
        foreach ($codigos as $indice => $codigo) {
            $this->assertMatchesRegularExpression('/^[A-F0-9]{8}(?:-[A-F0-9]{8}){3}$/', $codigo);
            $this->assertTrue(Hash::check($codigo, $guardados[$indice]->code_hash));
            $this->assertNotSame($codigo, $guardados[$indice]->code_hash);
            $this->assertArrayNotHasKey('code_hash', $guardados[$indice]->toArray());
        }
        $this->getJson('/api/recovery-codes')->assertExactJson(['data' => ['total' => 6, 'remaining' => 6]]);
    }

    public function test_wrong_password_keeps_the_existing_group(): void
    {
        $usuario = User::factory()->create();
        $this->generar($usuario);
        $ids = RecoveryCode::pluck('id')->all();
        $this->postJson('/api/recovery-codes', ['password' => 'incorrecta'])->assertUnprocessable();
        $this->assertSame($ids, RecoveryCode::pluck('id')->all());
    }

    public function test_regeneration_invalidates_old_codes_without_affecting_other_accounts(): void
    {
        $usuario = User::factory()->create();
        $otro = User::factory()->create();
        $viejos = $this->generar($usuario);
        $otros = $this->generar($otro);
        $this->generar($usuario);
        $this->postJson('/api/recuperar-contrasena', $this->datos($usuario, $viejos[0]))->assertUnprocessable();
        $this->assertDatabaseCount('recovery_codes', 12);
        $this->assertTrue(Hash::check($otros[0], RecoveryCode::where('user_id', $otro->id)->firstOrFail()->code_hash));
    }

    public function test_recovery_changes_the_password_and_each_code_works_only_once(): void
    {
        $usuario = User::factory()->create();
        $codigos = $this->generar($usuario);
        $datos = $this->datos($usuario, strtolower($codigos[0]));
        $this->postJson('/api/recuperar-contrasena', $datos)->assertOk();
        $this->assertTrue(Hash::check($datos['password'], $usuario->fresh()->password));
        $this->assertFalse(Hash::check('password', $usuario->fresh()->password));
        $this->assertSame(5, RecoveryCode::where('user_id', $usuario->id)->whereNull('used_at')->count());

        $datos['password'] = $datos['password_confirmation'] = 'SegundaClave123!';
        $this->postJson('/api/recuperar-contrasena', $datos)->assertUnprocessable()->assertJsonValidationErrors('recovery_code');
        $this->assertTrue(Hash::check('NuevaClave123!', $usuario->fresh()->password));
        $datos['recovery_code'] = $codigos[1];
        $this->postJson('/api/recuperar-contrasena', $datos)->assertOk();
        $this->assertSame(4, RecoveryCode::where('user_id', $usuario->id)->whereNull('used_at')->count());
    }

    public function test_invalid_account_or_code_has_a_generic_error_and_does_not_consume_codes(): void
    {
        $usuario = User::factory()->create();
        $otro = User::factory()->create();
        $codigos = $this->generar($usuario);
        $respuesta = $this->postJson('/api/recuperar-contrasena', $this->datos($otro, $codigos[0]))
            ->assertUnprocessable()->json('errors.recovery_code');
        $datos = $this->datos($usuario, $codigos[0]);
        $datos['email'] = 'no-existe@example.com';
        $this->assertSame($respuesta, $this->postJson('/api/recuperar-contrasena', $datos)->assertUnprocessable()->json('errors.recovery_code'));
        $this->assertSame(6, RecoveryCode::whereNull('used_at')->count());
        $this->assertTrue(Hash::check('password', $usuario->fresh()->password));
    }

    public function test_validation_errors_do_not_consume_a_code(): void
    {
        $usuario = User::factory()->create();
        $codigo = $this->generar($usuario)[0];
        $datos = $this->datos($usuario, $codigo);
        $datos['password_confirmation'] = 'distinta';
        $this->postJson('/api/recuperar-contrasena', $datos)->assertUnprocessable()->assertJsonValidationErrors('password');
        $datos['password'] = $datos['password_confirmation'] = str_repeat('á', 40);
        $this->postJson('/api/recuperar-contrasena', $datos)->assertUnprocessable()->assertJsonValidationErrors('password');
        $datos = $this->datos($usuario, 'codigo-mal-formado');
        $this->postJson('/api/recuperar-contrasena', $datos)->assertUnprocessable()->assertJsonValidationErrors('recovery_code');
        $this->assertSame(6, RecoveryCode::whereNull('used_at')->count());
    }

    public function test_recovery_revokes_only_the_owners_sessions_and_reset_tokens(): void
    {
        $usuario = User::factory()->create(['remember_token' => 'token-anterior']);
        $otro = User::factory()->create();
        $codigo = $this->generar($usuario)[0];
        foreach ([$usuario, $otro] as $cuenta) {
            DB::table('sessions')->insert(['id' => 'sesion-'.$cuenta->id, 'user_id' => $cuenta->id, 'payload' => base64_encode(serialize([])), 'last_activity' => time()]);
            DB::table('password_reset_tokens')->insert(['email' => $cuenta->email, 'token' => Hash::make('token-prueba'), 'created_at' => now()]);
        }
        $this->postJson('/api/recuperar-contrasena', $this->datos($usuario, $codigo))->assertOk();
        $this->assertDatabaseMissing('sessions', ['id' => 'sesion-'.$usuario->id]);
        foreach (DB::table('sessions')->where('user_id', $usuario->id)->get() as $sesion) {
            $contenido = json_decode(base64_decode($sesion->payload), true, flags: JSON_THROW_ON_ERROR);
            $this->assertArrayNotHasKey(Auth::guard('web')->getName(), $contenido);
        }
        $this->assertDatabaseHas('sessions', ['id' => 'sesion-'.$otro->id]);
        $this->assertDatabaseMissing('password_reset_tokens', ['email' => $usuario->email]);
        $this->assertDatabaseHas('password_reset_tokens', ['email' => $otro->email]);
        $this->assertNotSame('token-anterior', $usuario->fresh()->remember_token);
        $this->assertGuest('web');
    }
}
