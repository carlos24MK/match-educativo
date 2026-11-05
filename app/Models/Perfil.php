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

    protected $fillable = ['user_id', 'presentacion', 'ensena', 'aprende'];

    protected function casts(): array
    {
        return ['ensena' => 'array', 'aprende' => 'array'];
    }
}
