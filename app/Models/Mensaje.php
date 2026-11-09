<?php

namespace App\Models;

use Database\Factories\MensajeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Mensaje extends Model
{
    /** @use HasFactory<MensajeFactory> */
    use HasFactory;

    protected $table = 'mensajes';

    protected $fillable = ['match_id', 'remitente_id', 'contenido'];

    /** @return BelongsTo<MatchEducativo, $this> */
    public function matchEducativo(): BelongsTo
    {
        return $this->belongsTo(MatchEducativo::class, 'match_id');
    }

    /** @return BelongsTo<User, $this> */
    public function remitente(): BelongsTo
    {
        return $this->belongsTo(User::class, 'remitente_id');
    }
}
