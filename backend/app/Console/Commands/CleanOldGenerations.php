<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class CleanOldGenerations extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'generations:clean';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Clean generated zip files and directories older than 24 hours';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $cutoff = now()->subHours(24);
        
        $generations = \App\Models\Generation::where('created_at', '<', $cutoff)->get();
        
        $count = 0;
        foreach ($generations as $generation) {
            $basePath = storage_path("app/generations/{$generation->id}");
            $zipPath = storage_path("app/generations/laravel_project_{$generation->project_id}_{$generation->id}.zip");

            if (\Illuminate\Support\Facades\File::exists($basePath)) {
                \Illuminate\Support\Facades\File::deleteDirectory($basePath);
            }

            if (\Illuminate\Support\Facades\File::exists($zipPath)) {
                \Illuminate\Support\Facades\File::delete($zipPath);
            }
            
            $generation->delete();
            $count++;
        }

        $this->info("Deleted {$count} old generations.");
    }
}
