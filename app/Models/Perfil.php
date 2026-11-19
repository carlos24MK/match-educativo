<?php

namespace App\Models;

use Database\Factories\PerfilFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Perfil extends Model
{
    /** @use HasFactory<PerfilFactory> */
    use HasFactory;

    protected $table = 'perfiles';

    protected $fillable = [
        'user_id', 'presentacion', 'ensena', 'aprende', 'visible_en_busqueda',
        'programa', 'semestre', 'preferencias_estudio',
    ];

    protected $hidden = ['foto_path'];

    protected $attributes = ['visible_en_busqueda' => false];

    protected function casts(): array
    {
        return [
            'ensena' => 'array',
            'aprende' => 'array',
            'visible_en_busqueda' => 'boolean',
            'semestre' => 'integer',
        ];
    }

    public function fotoUrl(): ?string
    {
        if ($this->foto_path === null) {
            return null;
        }

        return route('estudiantes.foto', [
            'estudiante' => $this->user_id,
            'v' => substr(hash('sha256', $this->foto_path), 0, 16),
        ], absolute: false);
    }
}
