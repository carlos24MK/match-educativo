<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use Illuminate\Http\Request;

class RegistroController extends Controller 
{
    public function registrar(Request $request)
    {
      $datos = $request->validate([
        'name'  => ['required', 'string']
       
      ]);

      return response()->json([
        'nombre_recibido' => $datos['name']
      ]);
    }
}
  