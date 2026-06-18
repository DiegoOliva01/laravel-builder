<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'laravel_version' => $this->laravel_version,
            'installation_type' => $this->installation_type,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
            'downloads_count' => $this->downloads_count ?? 0,
            'generations_count' => $this->generations_count ?? 0,
            'latest_generation_id' => $this->relationLoaded('generations') && $this->generations->isNotEmpty() ? $this->generations->first()->id : null,
        ];
    }
}
