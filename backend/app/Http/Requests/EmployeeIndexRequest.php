<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EmployeeIndexRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware and policy
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:255'],
            'induk' => ['nullable', 'string', 'max:255'],
            'jabatan' => ['nullable', 'string', 'max:255'],
            'kode_jabatan' => ['nullable', 'string', 'max:50'],
            'status' => ['nullable', 'in:aktif,pensiun'],
            'golongan' => ['nullable', 'string', 'max:20'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'string', 'in:10,25,50,100,200,1500,all'],
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Sanitize and trim all string inputs
        $inputs = $this->all();
        
        foreach (['search', 'induk', 'jabatan', 'kode_jabatan', 'golongan'] as $field) {
            if (isset($inputs[$field])) {
                $inputs[$field] = trim($inputs[$field]);
            }
        }
        
        if (isset($inputs['status'])) {
            $inputs['status'] = strtolower(trim($inputs['status']));
        }
        
        $this->merge($inputs);
    }

    /**
     * Get validated data with defaults applied.
     */
    public function validated($key = null, $default = null)
    {
        $validated = parent::validated($key, $default);
        
        // Apply defaults
        $validated['page'] = $validated['page'] ?? 1;
        $validated['per_page'] = $validated['per_page'] ?? '15';
        $validated['search'] = $validated['search'] ?? '';
        $validated['induk'] = $validated['induk'] ?? '';
        $validated['jabatan'] = $validated['jabatan'] ?? '';
        $validated['kode_jabatan'] = $validated['kode_jabatan'] ?? '';
        $validated['status'] = $validated['status'] ?? '';
        $validated['golongan'] = $validated['golongan'] ?? '';
        
        return $validated;
    }
}

