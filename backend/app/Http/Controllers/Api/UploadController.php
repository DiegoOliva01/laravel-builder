<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Upload\UploadSqlRequest;
use App\Models\Project;
use App\Models\UploadedFile;
use App\Services\SqlParserService;
use App\Services\ModelBuilderService;
use App\Services\AiEnrichmentService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use App\Jobs\ProcessSqlSchemaJob;

class UploadController extends Controller
{
    public function __construct(
        private SqlParserService $parser,
        private ModelBuilderService $modelBuilder,
        private AiEnrichmentService $aiEnrichment
    ) {}

    /**
     * Upload and synchronously parse a SQL file for a given project.
     *
     * POST /api/v1/projects/{project}/upload
     *
     * Flow:
     *  1. Parse SQL (regex-based, fast <200ms)
     *  2. Enrich with Gemini AI (naming, implicit relations)
     *  3. Build domain model
     *  4. Persist and return result
     */
    public function uploadSql(UploadSqlRequest $request, Project $project): JsonResponse
    {
        // Authorization: only the project owner can upload
        $this->authorize('update', $project);

        $file = $request->file('file');

        // Store in local disk under uploads/{user_id}/{project_id}/
        $userId = $request->user()->id;
        $path   = $file->storeAs(
            "uploads/{$userId}/{$project->id}",
            $file->getClientOriginalName(),
            'local'
        );

        // Determine type based on extension
        $type = 'sql';

        // Record the uploaded file as 'pending'
        $record = UploadedFile::create([
            'project_id'    => $project->id,
            'user_id'       => $userId,
            'type'          => $type,
            'original_name' => $file->getClientOriginalName(),
            'stored_path'   => $path,
            'size_bytes'    => $file->getSize(),
            'status'        => 'pending',
            'parse_result'  => null,
        ]);

        $useAi = $request->boolean('use_ai', true);

        // Dispatch the background job to parse, enrich and build models
        ProcessSqlSchemaJob::dispatch($record->id, $useAi);

        return response()->json([
            'message' => 'Archivo SQL subido. Procesamiento en segundo plano iniciado.',
            'file_id' => $record->id,
            'status'  => 'pending',
        ], 202);
    }

    /**
     * Check the status of an uploaded file processing.
     *
     * GET /api/v1/projects/{project}/uploads/{uploadedFile}/status
     */
    public function getUploadStatus(Request $request, Project $project, UploadedFile $uploadedFile): \Illuminate\Http\JsonResponse
    {
        $this->authorize('view', $project);

        if ($uploadedFile->project_id !== $project->id) {
            abort(404, 'File not found for this project.');
        }

        return response()->json([
            'id'           => $uploadedFile->id,
            'status'       => $uploadedFile->status,
            'parse_result' => $uploadedFile->parse_result, // Will be populated when processed or failed
        ]);
    }
}
