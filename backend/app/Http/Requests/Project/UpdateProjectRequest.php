<?php

namespace App\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => [
                'sometimes', 
                'required', 
                'string', 
                'max:255',
                Rule::unique('projects')
                    ->where('user_id', $this->user()->id)
                    ->ignore($this->project)
            ],
            'laravel_version' => ['sometimes', 'required', 'string', 'in:10,11,12'],
            'installation_type' => ['sometimes', 'required', 'string', 'in:default,breeze,jetstream'],
        ];
    }
}
