<?php

use Illuminate\Routing\Router;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::redirect('/', '/registro');


Route::view('/registro', 'app');

route::view('/login', 'app');

Route::view('/dashboard', 'app')->middleware('auth:web');
