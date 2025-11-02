<?php

namespace App\Helpers;

use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

/**
 * Handle API exceptions and return safe error responses
 */
function handleApiException(Request $request, Throwable $exception): JsonResponse
{
    $statusCode = 500;
    $message = 'Internal Server Error';
    $errors = null;

    // Handle validation exceptions
    if ($exception instanceof ValidationException) {
        $statusCode = 422;
        $message = 'Validation error';
        $errors = $exception->errors();
        
        // Always return validation errors for auth endpoints (login, register, etc)
        // so users know what went wrong
        $isAuthEndpoint = $request->is('api/auth/*');
        
        // In production, only hide validation errors for non-auth endpoints
        if (app()->environment('production') && !$isAuthEndpoint) {
            $errors = null; // Don't expose validation errors details in production for non-auth endpoints
        }
    }
    // Handle HTTP exceptions
    elseif ($exception instanceof HttpException) {
        $statusCode = $exception->getStatusCode();
        $message = $exception->getMessage() ?: 'An error occurred';
    }

    // In production, don't expose detailed errors (but validation errors for auth are handled above)
    if (app()->environment('production') && !($exception instanceof ValidationException)) {
        $message = getSafeErrorMessage($statusCode);
    }

    return response()->json([
        'success' => false,
        'message' => $message,
        'error_code' => $statusCode,
        'errors' => $errors,
    ], $statusCode);
}

/**
 * Get safe error message for production
 */
function getSafeErrorMessage(int $statusCode): string
{
    return match($statusCode) {
        401 => 'Unauthorized',
        403 => 'Forbidden',
        404 => 'Resource not found',
        422 => 'Validation error',
        429 => 'Too many requests',
        500 => 'Internal server error',
        503 => 'Service unavailable',
        default => 'An error occurred',
    };
}

