<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

// Campos que permitimos guardar mediante create() o update().
#[Fillable(['user_id', 'code_hash', 'used_at'])]

// Evita incluir el hash en respuestas JSON del modelo.
#[Hidden(['code_hash'])]
class RecoveryCode extends Model
{
    protected function casts(): array
    {
        return [
            'used_at' => 'datetime',
        ];
    }

    // Cada código pertenece a un usuario.
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
