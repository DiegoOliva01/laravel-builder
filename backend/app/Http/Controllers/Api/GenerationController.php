<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Generation;
use App\Models\UploadedFile;
use App\Services\LaravelGeneratorService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

class GenerationController extends Controller
{
    public function __construct(private LaravelGeneratorService $generator) {}

    public function store(Request $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        // Get the latest processed uploaded file for this project
        $uploadedFile = UploadedFile::where('project_id', $project->id)
            ->where('status', 'processed')
            ->latest()
            ->first();

        if (!$uploadedFile || empty($uploadedFile->parse_result['models'])) {
            return response()->json(['message' => 'No se encontró un modelo de dominio válido para generar.'], 400);
        }

        // Create generation record
        $generation = Generation::create([
            'project_id'        => $project->id,
            'user_id'           => $request->user()->id,
            'status'            => 'processing',
            'project_name'      => $project->name,
            'laravel_version'   => $project->laravel_version,
            'installation_type' => $project->installation_type,
            'schema_snapshot'   => $uploadedFile->parse_result,
        ]);

        try {
            // Dispatch the generation job in the background
            \App\Jobs\GenerateProjectJob::dispatch($generation);

            return response()->json([
                'message' => 'Generación iniciada con éxito. El proceso puede demorar unos minutos.',
                'generation' => $generation
            ], 202);

        } catch (\Exception $e) {
            $generation->update([
                'status' => 'failed',
                'error_message' => $e->getMessage()
            ]);

            return response()->json(['message' => 'Error al iniciar la generación.', 'error' => $e->getMessage()], 500);
        }
    }

    public function download(Project $project, Generation $generation)
    {
        $this->authorize('view', $project);

        if ($generation->project_id !== $project->id) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        if ($generation->status !== 'completed') {
            return response()->json(['message' => 'La generación no está completada.'], 400);
        }

        $project->increment('downloads_count');

        if ($generation->download_url) {
            if (Storage::disk('s3')->exists($generation->download_url)) {
                $zipFileName = "laravel_project_{$project->id}_{$generation->id}.zip";
                return Storage::disk('s3')->download($generation->download_url, $zipFileName);
            }
        }

        $basePath = storage_path("app/generations/{$generation->id}");
        if (!File::exists($basePath)) {
            return response()->json(['message' => 'Archivos no encontrados.'], 404);
        }

        $zipFileName = "laravel_project_{$project->id}_{$generation->id}.zip";
        $zipPath = storage_path("app/generations/{$zipFileName}");

        $zip = new \ZipArchive();
        if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) === true) {
            $files = File::allFiles($basePath, true); // true includes hidden files (dotfiles)
            foreach ($files as $file) {
                $normalizedPathname = str_replace('\\', '/', $file->getPathname());
                $normalizedBasePath = str_replace('\\', '/', $basePath);
                $relativePath = str_replace($normalizedBasePath . '/', '', $normalizedPathname);
                $zipPathInternal = $relativePath;
                $zip->addFile($file->getPathname(), $zipPathInternal);
            }
            $zip->close();
        } else {
            return response()->json(['message' => 'No se pudo crear el archivo ZIP.'], 500);
        }

        return response()->download($zipPath)->deleteFileAfterSend(true);
    }

    /**
     * List all generations for a specific project.
     */
    public function projectGenerations(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        $generations = Generation::where('project_id', $project->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['generations' => $generations]);
    }

    /**
     * Get a specific generation status.
     */
    public function show(Request $request, Project $project, Generation $generation): JsonResponse
    {
        $this->authorize('view', $project);

        if ($generation->project_id !== $project->id) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        return response()->json(['generation' => $generation]);
    }

    /**
     * List all generations for the authenticated user (history).
     */
    public function index(Request $request): JsonResponse
    {
        $generations = Generation::where('user_id', $request->user()->id)
            ->with('project:id,name,laravel_version')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['generations' => $generations]);
    }

    /**
     * Delete a generation record and its generated files.
     */
    public function destroy(Request $request, Generation $generation): JsonResponse
    {
        if ($generation->user_id !== $request->user()->id) {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        // Delete generated files from disk
        $basePath = storage_path("app/generations/{$generation->id}");
        if (File::exists($basePath)) {
            File::deleteDirectory($basePath);
        }

        $generation->delete();

        return response()->json(['message' => 'Generación eliminada.']);
    }
}
