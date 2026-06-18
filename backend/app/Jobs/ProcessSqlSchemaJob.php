<?php

namespace App\Jobs;

use App\Models\UploadedFile;
use App\Services\SqlParserService;
use App\Services\ModelBuilderService;
use App\Services\AiEnrichmentService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ProcessSqlSchemaJob implements ShouldQueue
{
    use Queueable;

    // Give it more time if AI is slow
    public $timeout = 120;

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $uploadedFileId,
        public bool $useAi = true
    ) {}

    /**
     * Execute the job.
     */
    public function handle(
        SqlParserService $parser,
        AiEnrichmentService $aiEnrichment,
        ModelBuilderService $modelBuilder
    ): void {
        $fileRecord = UploadedFile::find($this->uploadedFileId);

        if (!$fileRecord) {
            Log::error("ProcessSqlSchemaJob: UploadedFile {$this->uploadedFileId} not found.");
            return;
        }

        try {
            $fileRecord->update(['status' => 'processing']);

            // Read SQL content
            $sqlContent = Storage::disk('local')->get($fileRecord->stored_path);
            if (!$sqlContent) {
                throw new \Exception("Could not read file from storage: {$fileRecord->stored_path}");
            }

            // Step 1 — Parse synchronously (fast, regex-based)
            $parseResult = $parser->parse($sqlContent);

            // Step 2 — Enrich with AI (naming + implicit relations) if requested
            if ($this->useAi) {
                $parseResult = $aiEnrichment->enrich($parseResult);
            }

            // Step 3 — Build the domain model
            $parseResult['models'] = $modelBuilder->build($parseResult['tables'], $parseResult['relations']);

            // Step 4 — Save results and mark as processed
            $fileRecord->update([
                'status'       => 'processed',
                'parse_result' => $parseResult,
            ]);

            Log::info("ProcessSqlSchemaJob: File {$this->uploadedFileId} processed successfully.");

        } catch (\Throwable $e) {
            Log::error("ProcessSqlSchemaJob failed for file {$this->uploadedFileId}", [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            $fileRecord->update([
                'status' => 'failed',
                'parse_result' => [
                    'error' => 'Hubo un error procesando el esquema: ' . $e->getMessage()
                ],
            ]);
            
            throw $e; // Rethrow so the queue worker marks the job as failed
        }
    }
}
