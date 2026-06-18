<?php

namespace App\Http\Requests\Project;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required', 
                'string', 
                'max:255',
                Rule::unique('projects')->where('user_id', $this->user()->id)
            ],
            'laravel_version' => ['required', 'string', 'in:10,11,12'],
            'installation_type' => ['required', 'string', 'in:default,breeze,jetstream'],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required' => 'El nombre del proyecto es obligatorio.',
            'name.unique' => 'Ya tienes un proyecto con este nombre.',
            'laravel_version.in' => 'La versión de Laravel seleccionada no es válida.',
            'installation_type.in' => 'El tipo de instalación seleccionado no es válido.',
        ];
    }
}
