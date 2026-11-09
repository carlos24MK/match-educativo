<?php

namespace App\Models;

use Database\Factories\MatchEducativoFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MatchEducativo extends Model
{
    /** @use HasFactory<MatchEducativoFactory> */
    use HasFactory;

    protected $table = 'matches';

    protected $fillable = ['solicitante_id', 'destinatario_id', 'pareja', 'estado'];

    protected $attributes = ['estado' => 'pendiente'];

    protected function casts(): array
    {
        return ['solicitante_id' => 'integer', 'destinatario_id' => 'integer'];
    }

    public function solicitante(): BelongsTo
    {
        return $this->belongsTo(User::class, 'solicitante_id');
    }

    public function destinatario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'destinatario_id');
    }

    /** Las dos direcciones comparten la misma clave para evitar solicitudes cruzadas. */
    public static function clavePareja(int $uno, int $otro): string
    {
        return min($uno, $otro).':'.max($uno, $otro);
    }
}
