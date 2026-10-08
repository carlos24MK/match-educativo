<?php

use Illuminate\Support\Facades\Route;

Route::redirect('/', '/registro');
Route::view('/registro', 'app')->name('registro');
Route::view('/login', 'app')->name('login');
Route::view('/recuperar-contrasena', 'app')->name('recuperar-contrasena');

Route::view('/dashboard', 'app')
    ->middleware(['auth:web', 'auth.session'])->name('dashboard');

Route::view('/configuracion/seguridad', 'app')
    ->middleware(['auth:web', 'auth.session'])->name('seguridad');
