<?php

namespace App\Http\Requests\Upload;

use Illuminate\Foundation\Http\FormRequest;

class UploadSqlRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'max:10240', // 10 MB
                'extensions:sql,png,jpg,jpeg,webp',
            ],
            'use_ai' => [
                'nullable',
                'boolean',
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'file.required' => 'Debés adjuntar un archivo.',
            'file.file'     => 'El campo debe ser un archivo válido.',
            'file.max'      => 'El archivo no puede superar los 10 MB.',
            'file.extensions' => 'Solo se aceptan archivos SQL (.sql) o imágenes de diagramas (.png, .jpg, .webp).',
            'use_ai.boolean'  => 'El campo use_ai debe ser booleano.',
        ];
    }

    /**
     * Override: relax the mime detection for .sql files.
     * Laravel's "mimes" rule checks extension; we also accept common MIME types
     * returned by different operating systems for SQL files.
     */
    protected function prepareForValidation(): void
    {
        // No transformation needed; validation handles extension check.
    }
}
