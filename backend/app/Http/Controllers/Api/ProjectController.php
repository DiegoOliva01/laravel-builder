<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Project\StoreProjectRequest;
use App\Http\Requests\Project\UpdateProjectRequest;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProjectController extends Controller
{
    /**
     * List all projects for the authenticated user.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $projects = $request->user()
            ->projects()
            ->withCount('generations')
            ->with('generations', fn($q) => $q->latest()->select('id', 'project_id'))
            ->latest()
            ->paginate(15);

        return ProjectResource::collection($projects);
    }

    /**
     * Create a new project.
     */
    public function store(StoreProjectRequest $request): JsonResponse
    {
        $project = $request->user()->projects()->create($request->validated());

        return response()->json(new ProjectResource($project), 201);
    }

    /**
     * Show a single project.
     */
    public function show(Request $request, Project $project): JsonResponse
    {
        $this->authorize('view', $project);

        return response()->json(new ProjectResource($project));
    }

    /**
     * Update an existing project.
     */
    public function update(UpdateProjectRequest $request, Project $project): JsonResponse
    {
        $this->authorize('update', $project);

        $project->update($request->validated());

        return response()->json(new ProjectResource($project));
    }

    /**
     * Delete a project.
     */
    public function destroy(Request $request, Project $project): JsonResponse
    {
        $this->authorize('delete', $project);

        $project->delete();

        return response()->json([
            'message' => 'Proyecto eliminado correctamente.',
        ]);
    }
}
