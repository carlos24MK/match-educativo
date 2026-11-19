<?php

namespace Tests\Feature;

use App\Models\Perfil;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class PerfilTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_requires_a_session(): void
    {
        $this->get('/perfil')->assertRedirect('/login');
        $this->getJson('/api/perfil')->assertUnauthorized();
        $this->postJson('/api/perfil')->assertUnauthorized();
    }

    public function test_student_can_save_and_update_only_their_profile(): void
    {
        $otro = Perfil::factory()->create();
        $usuario = User::factory()->create();
        $this->actingAs($usuario, 'web');

        $detallesVacios = [
            'nombre' => $usuario->name,
            'programa' => '',
            'semestre' => null,
            'preferencias_estudio' => '',
            'foto_url' => null,
        ];
        $this->getJson('/api/perfil')->assertOk()->assertExactJson([
            'presentacion' => '', 'ensena' => [], 'aprende' => [], 'visible_en_busqueda' => false,
        ] + $detallesVacios);

        $datos = [
            'presentacion' => 'Busco compañeros para estudiar.',
            'ensena' => ['Matemáticas'],
            'aprende' => ['JavaScript'],
            'visible_en_busqueda' => true,
        ];
        $this->postJson('/api/perfil', $datos + ['user_id' => $otro->user_id])
            ->assertOk()->assertExactJson($datos + $detallesVacios);
        $this->getJson('/api/perfil')->assertOk()->assertExactJson($datos + $detallesVacios);

        $datos['ensena'] = [];
        $datos['visible_en_busqueda'] = false;
        $this->postJson('/api/perfil', $datos)->assertOk()->assertExactJson($datos + $detallesVacios);

        $this->assertDatabaseCount('perfiles', 2);
        $this->assertSame(['Matemáticas'], $otro->fresh()->ensena);
        $this->assertSame([], Perfil::where('user_id', $usuario->id)->firstOrFail()->ensena);
    }

    public function test_student_can_personalize_and_clear_optional_details(): void
    {
        $usuario = User::factory()->create();
        $perfil = Perfil::factory()->create(['user_id' => $usuario->id]);
        $this->actingAs($usuario, 'web');

        $datos = ['presentacion' => 'Busco un grupo de estudio.', 'ensena' => [], 'aprende' => []];
        $detalles = [
            'programa' => 'Ingeniería de sistemas',
            'semestre' => 4,
            'preferencias_estudio' => 'Prefiero estudiar en grupo los sábados.',
        ];

        $this->postJson('/api/perfil', $datos + $detalles)
            ->assertOk()->assertJsonFragment($detalles);
        $this->assertDatabaseHas('perfiles', ['id' => $perfil->id] + $detalles);

        $this->postJson('/api/perfil', $datos)
            ->assertOk()->assertJsonFragment($detalles);
        $this->getJson('/api/perfil')
            ->assertOk()->assertJsonFragment($detalles);

        $this->postJson('/api/perfil', $datos + array_fill_keys(array_keys($detalles), null))
            ->assertOk()->assertJsonFragment(['programa' => '', 'semestre' => null, 'preferencias_estudio' => '']);
    }

    public function test_invalid_skills_do_not_create_a_profile(): void
    {
        $this->actingAs(User::factory()->create(), 'web')
            ->postJson('/api/perfil', [
                'presentacion' => str_repeat('a', 501),
                'ensena' => ['React', 'react'],
                'aprende' => [str_repeat('a', 61)],
                'programa' => str_repeat('a', 101),
                'semestre' => 13,
                'preferencias_estudio' => str_repeat('a', 161),
            ])->assertUnprocessable()->assertJsonValidationErrors([
                'presentacion', 'ensena.0', 'aprende.0', 'programa', 'semestre', 'preferencias_estudio',
            ]);

        $this->assertDatabaseCount('perfiles', 0);
    }

    public function test_profile_photo_can_be_replaced_and_removed_by_its_owner(): void
    {
        $disco = Storage::fake('local');
        $usuario = User::factory()->create();
        $this->actingAs($usuario, 'web');
        $foto = $this->pngDePrueba();

        $respuesta = $this->post('/api/perfil/foto', [
            'foto' => UploadedFile::fake()->createWithContent('retrato.png', $foto),
        ], ['Accept' => 'application/json'])->assertOk();
        $url = $respuesta->json('foto_url');
        $this->assertStringStartsWith('/api/estudiantes/'.$usuario->id.'/foto', $url);
        $this->getJson('/api/perfil')->assertOk()->assertJsonPath('foto_url', $url)
            ->assertJsonMissingPath('foto_path');
        $this->get($url)->assertOk()->assertHeader('Content-Type', 'image/png')
            ->assertHeader('Content-Disposition', 'inline')->assertContent($foto);
        $this->assertCount(1, $disco->allFiles());
        $rutaAnterior = $disco->allFiles()[0];

        $reemplazo = $this->post('/api/perfil/foto', [
            'foto' => UploadedFile::fake()->createWithContent('otra-foto.png', $foto),
        ], ['Accept' => 'application/json'])->assertOk()->json('foto_url');
        $this->assertNotSame($url, $reemplazo);
        $disco->assertMissing($rutaAnterior);
        $this->assertCount(1, $disco->allFiles());
        $this->getJson('/api/perfil')->assertOk()->assertJsonPath('foto_url', $reemplazo);

        $this->deleteJson('/api/perfil/foto')->assertOk()->assertExactJson(['foto_url' => null]);
        $this->getJson('/api/perfil')->assertOk()->assertJsonPath('foto_url', null);
        $this->get($reemplazo)->assertNotFound();
        $this->assertSame([], $disco->allFiles());
    }

    public function test_only_the_owner_can_see_a_hidden_photo_and_visibility_can_be_revoked(): void
    {
        Storage::fake('local');
        $usuario = User::factory()->create();
        $perfil = Perfil::factory()->create([
            'user_id' => $usuario->id,
            'programa' => 'Ingeniería de sistemas',
            'semestre' => 4,
            'preferencias_estudio' => 'Sesiones grupales',
        ]);
        $ruta = '/api/estudiantes/'.$usuario->id.'/foto';
        $this->getJson($ruta)->assertUnauthorized();
        $this->postJson('/api/perfil/foto')->assertUnauthorized();
        $this->deleteJson('/api/perfil/foto')->assertUnauthorized();

        $fotoUrl = $this->actingAs($usuario, 'web')->post('/api/perfil/foto', [
            'foto' => UploadedFile::fake()->createWithContent('retrato.png', $this->pngDePrueba()),
        ], ['Accept' => 'application/json'])->assertOk()->json('foto_url');

        Auth::forgetGuards();
        $this->actingAs(User::factory()->create(), 'web')->getJson($ruta)->assertNotFound();
        $this->getJson('/api/estudiantes')->assertOk()->assertJsonCount(0, 'data');
        $perfil->update(['visible_en_busqueda' => true]);
        $respuesta = $this->get($ruta)->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertStringContainsString('no-store', $respuesta->headers->get('Cache-Control'));
        $this->assertStringContainsString('private', $respuesta->headers->get('Cache-Control'));
        $this->getJson('/api/estudiantes')->assertOk()
            ->assertJsonPath('data.0.id', $usuario->id)
            ->assertJsonPath('data.0.programa', 'Ingeniería de sistemas')
            ->assertJsonPath('data.0.semestre', 4)
            ->assertJsonPath('data.0.preferencias_estudio', 'Sesiones grupales')
            ->assertJsonPath('data.0.foto_url', $fotoUrl)
            ->assertJsonMissingPath('data.0.foto_path')
            ->assertJsonMissingPath('data.0.email');

        $perfil->update(['visible_en_busqueda' => false]);
        $this->getJson($ruta)->assertNotFound();
        $this->getJson('/api/estudiantes')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_invalid_or_oversized_uploads_do_not_store_a_photo(): void
    {
        $disco = Storage::fake('local');
        $this->actingAs(User::factory()->create(), 'web');

        $this->post('/api/perfil/foto', [
            'foto' => UploadedFile::fake()->createWithContent('retrato.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>'),
        ], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('foto');
        $this->post('/api/perfil/foto', [
            'foto' => UploadedFile::fake()->createWithContent('retrato.png', $this->pngDePrueba())->size(2049),
        ], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('foto');

        $this->assertSame([], $disco->allFiles());
    }

    private function pngDePrueba(): string
    {
        // Imagen de 64 por 64 píxeles que permite probar sin la extensión GD.
        return base64_decode('iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAIklEQVRoge3BAQ0AAADCoPdPbQ8HFAAAAAAAAAAAAAAA8G4wQAAB9qDgAAAAAABJRU5ErkJggg==');
    }
}
