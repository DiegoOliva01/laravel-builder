<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Symfony\Component\Process\Process;

class CompileTemplatesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'templates:compile {version : The Laravel major version (10, 11, 12)} {type : The installation type (default, breeze, jetstream)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Compile a pre-configured Laravel skeleton template ZIP with optional scaffolding';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $version = $this->argument('version');
        $type = $this->argument('type');

        if (!in_array($version, ['10', '11', '12'])) {
            $this->error("Invalid version: {$version}. Must be 10, 11, or 12.");
            return 1;
        }

        if (!in_array($type, ['default', 'breeze', 'jetstream'])) {
            $this->error("Invalid type: {$type}. Must be default, breeze, or jetstream.");
            return 1;
        }

        $this->info("Starting compilation for Laravel {$version} ({$type})...");

        // Setup paths
        $templatesDir = storage_path('app/laravel-templates');
        File::ensureDirectoryExists($templatesDir);

        $tmpDir = storage_path("app/laravel-templates/compile_tmp_{$version}_{$type}");
        if (File::exists($tmpDir)) {
            File::deleteDirectory($tmpDir);
        }
        File::ensureDirectoryExists($tmpDir);

        $zipPath = "{$tmpDir}/skeleton.zip";
        $url = "https://github.com/laravel/laravel/archive/refs/heads/{$version}.x.zip";

        // Download base template
        $this->info("Downloading base Laravel {$version} skeleton from GitHub...");
        $content = file_get_contents($url);
        if ($content === false) {
            $this->error("Failed to download template from: {$url}");
            return 1;
        }
        File::put($zipPath, $content);

        // Extract ZIP
        $this->info("Extracting base skeleton...");
        $zip = new \ZipArchive();
        if ($zip->open($zipPath) === true) {
            $zip->extractTo($tmpDir);
            $zip->close();
        } else {
            $this->error("Failed to open downloaded ZIP file.");
            return 1;
        }
        File::delete($zipPath);

        // Find the extracted folder
        $dirs = File::directories($tmpDir);
        if (empty($dirs)) {
            $this->error("No directories found after extraction.");
            return 1;
        }
        $projectPath = $dirs[0];

        // Ensure .env file exists for installers that modify it (like Jetstream)
        if (File::exists("{$projectPath}/.env.example") && !File::exists("{$projectPath}/.env")) {
            File::copy("{$projectPath}/.env.example", "{$projectPath}/.env");
        }

        // Perform scaffolding installation if needed
        if ($type !== 'default') {
            $this->info("Configuring composer platform PHP version...");
            $this->runShellCommand(['composer', 'config', 'platform.php', '8.2.0'], $projectPath);

            $this->info("Running 'composer install' in the temporary project (this may take a minute)...");
            $this->runShellCommand(['composer', 'install', '--no-dev', '--no-interaction', '--no-progress', '--prefer-dist'], $projectPath);

            if ($type === 'breeze') {
                $this->info("Installing Laravel Breeze...");
                $this->runShellCommand(['composer', 'require', 'laravel/breeze', '--no-interaction', '--prefer-dist'], $projectPath);
                $this->runShellCommand(['php', 'artisan', 'breeze:install', 'blade', '--no-interaction'], $projectPath);
            } elseif ($type === 'jetstream') {
                $this->info("Installing Laravel Jetstream...");
                $this->runShellCommand(['composer', 'require', 'laravel/jetstream', '--no-interaction', '--prefer-dist'], $projectPath);
                $this->runShellCommand(['php', 'artisan', 'jetstream:install', 'livewire', '--no-interaction'], $projectPath);
            }
        }

        // Clean up vendor, node_modules, and git files to keep ZIP size small
        $this->info("Cleaning up vendor, node_modules, and git files...");
        File::deleteDirectory("{$projectPath}/vendor");
        File::deleteDirectory("{$projectPath}/node_modules");
        File::deleteDirectory("{$projectPath}/.git");
        File::deleteDirectory("{$projectPath}/.github");
        File::delete("{$projectPath}/.env");

        // Give Windows a moment to release any file locks from child processes
        $this->info("Waiting for file locks to release...");
        sleep(3);

        // Create the final ZIP file
        $suffix = $type === 'default' ? '' : "-{$type}";
        $outputZipName = "{$version}.x{$suffix}.zip";
        $tempZipPath = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'laravel_tpl_' . uniqid() . '.zip';
        $outputZipPath = "{$templatesDir}/{$outputZipName}";

        $this->info("Creating final ZIP template: {$outputZipName}...");
        $finalZip = new \ZipArchive();
        if ($finalZip->open($tempZipPath, \ZipArchive::CREATE | \ZipArchive::OVERWRITE) === true) {
            $files = new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($projectPath));
            $count = 0;
            foreach ($files as $file) {
                if ($file->isFile()) {
                    $count++;
                    $realPath = $file->getRealPath();
                    $normalizedRealPath = str_replace('\\', '/', $realPath);
                    $normalizedProjectPath = str_replace('\\', '/', $projectPath);
                    $relativePath = str_replace($normalizedProjectPath . '/', '', $normalizedRealPath);
                    $zipPathInternal = $relativePath;
                    $res = $finalZip->addFile($realPath, $zipPathInternal);
                    if ($res === false) {
                        $this->error("FAIL addFile: {$realPath} as {$zipPathInternal}");
                    }
                }
            }
            $this->info("Added {$count} files. Closing ZIP...");
            $closeRes = $finalZip->close();
            if ($closeRes === false) {
                $this->error("FAIL close(): status " . $finalZip->status . " / statusSys " . $finalZip->statusSys);
                throw new \RuntimeException("ZipArchive::close() failed: " . $finalZip->getStatusString());
            }

            if (File::exists($outputZipPath)) {
                @File::delete($outputZipPath);
            }
            File::move($tempZipPath, $outputZipPath);
            $this->info("Template successfully created at: {$outputZipPath}");
        } else {
            $this->error("Failed to create output ZIP archive.");
            File::deleteDirectory($tmpDir);
            return 1;
        }

        // Clean up temp compilation directory
        File::deleteDirectory($tmpDir);
        $this->info("Compilation completed successfully!");
        return 0;
    }

    /**
     * Run a shell command synchronously and dump output.
     */
    private function runShellCommand(array $command, string $cwd)
    {
        $process = new Process($command, $cwd, [
            'GIT_TERMINAL_PROMPT' => '0',
            'COMPOSER_NO_INTERACTION' => '1',
            'COMPOSER_PROCESS_TIMEOUT' => '2000',
            'GCM_INTERACTIVE' => 'never',
            'GIT_ASKPASS' => 'echo',
            'SSH_ASKPASS' => 'echo',
            'GIT_SSH_COMMAND' => 'ssh -o BatchMode=yes',
        ]);
        $process->setTimeout(1200); // 20 minutes max
        $process->run(function ($type, $buffer) {
            $this->output->write($buffer);
        });

        if (!$process->isSuccessful()) {
            $this->error("Command failed: " . implode(' ', $command));
            throw new \RuntimeException($process->getErrorOutput());
        }
    }
}
