<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/auth/google/redirect', [\App\Http\Controllers\Api\GoogleAuthController::class, 'redirect']);
Route::get('/auth/google/callback', [\App\Http\Controllers\Api\GoogleAuthController::class, 'callback']);
