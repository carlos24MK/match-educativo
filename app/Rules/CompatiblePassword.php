<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Translation\PotentiallyTranslatedString;

class CompatiblePassword implements ValidationRule
{
    /**
     * Run the validation rule.
     *
     * @param  Closure(string, ?string=): PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || str_contains($value, "\0")) {
            $fail('La contraseña contiene un carácter no permitido.');

            return;
        }

        // Bcrypt no debe truncar dos contraseñas al mismo prefijo de 72 bytes.
        if (config('hashing.driver') === 'bcrypt' && strlen($value) > 72) {
            $fail('La contraseña es demasiado larga. Usa una contraseña más corta.');
        }
    }
}
