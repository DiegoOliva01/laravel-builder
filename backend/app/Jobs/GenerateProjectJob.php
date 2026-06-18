<?php

namespace App\Jobs;

use App\Models\Generation;
use App\Models\Project;
use App\Services\LaravelGeneratorService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;

class GenerateProjectJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * Delete the job if its models no longer exist.
     *
     * @var bool
     */
    public $deleteWhenMissingModels = true;

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public $timeout = 360;


    /**
     * Create a new job instance.
     */
    public function __construct(public Generation $generation)
    {
    }

    /**
     * Execute the job.
     */
    public function handle(LaravelGeneratorService $generator, \App\Services\AiDocumentationService $aiDocs): void
    {
        $generation = $this->generation;
        $project = $generation->project;

        if (!$project) {
            $generation->update([
                'status' => 'failed',
                'error_message' => 'Proyecto asociado no encontrado.'
            ]);
            return;
        }

        try {
            $basePath = storage_path("app/generations/{$generation->id}_tmp");
            File::ensureDirectoryExists("{$basePath}/app/Models");
            File::ensureDirectoryExists("{$basePath}/database/migrations");
            File::ensureDirectoryExists("{$basePath}/database/factories");
            File::ensureDirectoryExists("{$basePath}/database/seeders");
            File::ensureDirectoryExists("{$basePath}/app/Http/Controllers/Api");
            File::ensureDirectoryExists("{$basePath}/app/Http/Resources");
            File::ensureDirectoryExists("{$basePath}/routes");

            $models = $generation->schema_snapshot['models'] ?? [];

            // Generate Documentation via AI
            $readmeContent = $aiDocs->generateReadme($models, $project->name);
            File::put("{$basePath}/README.md", $readmeContent);

            $databaseDocsContent = $aiDocs->generateTechnicalDocs($models);
            File::put("{$basePath}/DATABASE.md", $databaseDocsContent);

            $migrationCounter = 0;
            foreach ($models as $modelData) {
                // Generate Model
                $modelContent = $generator->generateModel($modelData);
                File::put("{$basePath}/app/Models/{$modelData['model_name']}.php", $modelContent);

                // Generate Migration
                $migrationContent = $generator->generateMigration($modelData);
                $timestamp = date('Y_m_d_His', strtotime("+$migrationCounter seconds"));
                $migrationName = "{$timestamp}_create_{$modelData['table_name']}_table.php";
                File::put("{$basePath}/database/migrations/{$migrationName}", $migrationContent);

                // Generate Factory
                $factoryContent = $generator->generateFactory($modelData);
                File::put("{$basePath}/database/factories/{$modelData['model_name']}Factory.php", $factoryContent);

                // Generate Seeder
                $seederContent = $generator->generateSeeder($modelData);
                File::put("{$basePath}/database/seeders/{$modelData['model_name']}Seeder.php", $seederContent);
                
                // Generate Controller
                $controllerContent = $generator->generateController($modelData);
                File::put("{$basePath}/app/Http/Controllers/Api/{$modelData['model_name']}Controller.php", $controllerContent);

                // Generate Requests
                File::ensureDirectoryExists("{$basePath}/app/Http/Requests/{$modelData['model_name']}");
                $storeRequest = $generator->generateRequest($modelData, 'Store');
                File::put("{$basePath}/app/Http/Requests/{$modelData['model_name']}/Store{$modelData['model_name']}Request.php", $storeRequest);
                
                $updateRequest = $generator->generateRequest($modelData, 'Update');
                File::put("{$basePath}/app/Http/Requests/{$modelData['model_name']}/Update{$modelData['model_name']}Request.php", $updateRequest);

                // Generate Resource
                $resourceContent = $generator->generateApiResource($modelData);
                File::put("{$basePath}/app/Http/Resources/{$modelData['model_name']}Resource.php", $resourceContent);

                $migrationCounter++;
            }

            // Generate API Routes
            $routesContent = $generator->generateApiRoutes($models);
            File::put("{$basePath}/routes/api.php", $routesContent);

            // Merge with full Laravel skeleton
            $suffix = '';
            $installType = $generation->installation_type ?? $project->installation_type ?? 'default';
            if ($installType === 'breeze') {
                $suffix = '-breeze';
            } elseif ($installType === 'jetstream') {
                $suffix = '-jetstream';
            }

            $templateZipName = "{$project->laravel_version}.x{$suffix}.zip";
            $templateZip = storage_path("app/laravel-templates/{$templateZipName}");

            File::ensureDirectoryExists(dirname($templateZip));
            if (!File::exists($templateZip)) {
                if ($suffix === '') {
                    $url = "https://github.com/laravel/laravel/archive/refs/heads/{$project->laravel_version}.x.zip";
                    $content = @file_get_contents($url);
                    if ($content !== false) {
                        File::put($templateZip, $content);
                    }
                }
            }

            $finalPath = storage_path("app/generations/{$generation->id}");

            if (File::exists($templateZip)) {
                $skeletonTmp = storage_path("app/generations/{$generation->id}_skeleton");
                File::ensureDirectoryExists($skeletonTmp);

                $zip = new \ZipArchive();
                if ($zip->open($templateZip) === true) {
                    $zip->extractTo($skeletonTmp);
                    $zip->close();
                }

                $extractedDirs = File::directories($skeletonTmp);
                if (count($extractedDirs) === 1 && count(File::files($skeletonTmp)) === 0) {
                    File::copyDirectory($extractedDirs[0], $finalPath);
                } else {
                    File::copyDirectory($skeletonTmp, $finalPath);
                }

                File::deleteDirectory($skeletonTmp);

                File::copyDirectory($basePath, $finalPath);

                // Register API routes in bootstrap/app.php for Laravel 11 and 12
                if (in_array($project->laravel_version, ['11', '12'])) {
                    $bootstrapAppPath = "{$finalPath}/bootstrap/app.php";
                    if (File::exists($bootstrapAppPath)) {
                        $content = File::get($bootstrapAppPath);
                        if (str_contains($content, 'web: __DIR__.\'/../routes/web.php\',') && !str_contains($content, 'api:')) {
                            $content = str_replace(
                                'web: __DIR__.\'/../routes/web.php\',',
                                "web: __DIR__.'/../routes/web.php',\n        api: __DIR__.'/../routes/api.php',",
                                $content
                            );
                            File::put($bootstrapAppPath, $content);
                        }
                    }
                }

                if (File::exists("{$finalPath}/.env.example")) {
                    File::copy("{$finalPath}/.env.example", "{$finalPath}/.env");
                }
            } else {
                File::ensureDirectoryExists($finalPath);
                File::copyDirectory($basePath, $finalPath);
            }

            File::deleteDirectory($basePath);

            // Compress the generated project directory into a ZIP file
            $zipFileName = "laravel_project_{$project->id}_{$generation->id}.zip";
            $zipPath = storage_path("app/generations/{$zipFileName}");

            File::ensureDirectoryExists(dirname($zipPath));

            $zip = new \ZipArchive();
            if ($zip->open($zipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) === true) {
                $files = File::allFiles($finalPath, true); // true includes dotfiles
                foreach ($files as $file) {
                    $normalizedPathname = str_replace('\\', '/', $file->getPathname());
                    $normalizedFinalPath = str_replace('\\', '/', $finalPath);
                    $relativePath = str_replace($normalizedFinalPath . '/', '', $normalizedPathname);
                    $zipPathInternal = $relativePath;
                    $zip->addFile($file->getPathname(), $zipPathInternal);
                }
                $zip->close();
            } else {
                throw new \RuntimeException("No se pudo crear el archivo ZIP localmente.");
            }

            // Upload ZIP file to Supabase Storage (S3-compatible)
            $s3Path = "generations/{$zipFileName}";
            Storage::disk('s3')->put($s3Path, file_get_contents($zipPath));

            // Clean up local final directory and local ZIP file
            File::deleteDirectory($finalPath);
            File::delete($zipPath);

            // Update database record
            $generation->update([
                'download_url' => $s3Path,
                'status' => 'completed'
            ]);

        } catch (\Exception $e) {
            $generation->update([
                'status' => 'failed',
                'error_message' => $e->getMessage()
            ]);
        }
    }
}
