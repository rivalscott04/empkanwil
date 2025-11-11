<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class EmployeeByLocationRequest extends FormRequest
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
            'induk_unit' => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'], // For display name
            'search' => ['nullable', 'string', 'max:255'],
            'status' => ['nullable', 'in:aktif,pensiun'],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'string', 'in:10,25,50,100,200,1500'],
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        $inputs = $this->all();
        
        foreach (['induk_unit', 'location', 'search'] as $field) {
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
        $validated['per_page'] = $validated['per_page'] ?? 25;
        $validated['search'] = $validated['search'] ?? '';
        $validated['status'] = $validated['status'] ?? '';
        $validated['location'] = $validated['location'] ?? '';
        
        return $validated;
    }
}

