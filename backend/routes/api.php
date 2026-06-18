<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\UploadController;
use App\Http\Controllers\Api\GenerationController;

/*
|--------------------------------------------------------------------------
| API Routes — v1
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // Public routes
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    // Protected routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/user', [AuthController::class, 'user']);

        // Projects CRUD
        Route::apiResource('projects', ProjectController::class);

        // File uploads (nested under project)
        Route::post('/projects/{project}/upload', [UploadController::class, 'uploadSql']);
        Route::get('/projects/{project}/uploads/{uploadedFile}/status', [UploadController::class, 'getUploadStatus']);

        // Generations (nested under project)
        Route::post('/projects/{project}/generations', [GenerationController::class, 'store'])->middleware('throttle:generations');
        Route::get('/projects/{project}/generations', [GenerationController::class, 'projectGenerations']);
        Route::get('/projects/{project}/generations/{generation}', [GenerationController::class, 'show']);
        Route::get('/projects/{project}/generations/{generation}/download', [GenerationController::class, 'download']);

        // History (all generations for the authenticated user)
        Route::get('/generations', [GenerationController::class, 'index']);
        Route::delete('/generations/{generation}', [GenerationController::class, 'destroy']);
    });

});

