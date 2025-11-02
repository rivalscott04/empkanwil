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
    }
    // Handle HTTP exceptions
    elseif ($exception instanceof HttpException) {
        $statusCode = $exception->getStatusCode();
        $message = $exception->getMessage() ?: 'An error occurred';
    }

    // In production, don't expose detailed errors
    if (app()->environment('production')) {
        $message = getSafeErrorMessage($statusCode);
        $errors = null; // Don't expose validation errors details in production
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

