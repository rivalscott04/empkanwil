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
 * Add CORS headers to response
 */
function addCorsHeadersToResponse(JsonResponse $response, Request $request): void
{
    $allowedOrigins = explode(',', env('ALLOWED_ORIGINS', 'https://sdm.rivaldev.site,http://localhost:3800'));
    $allowedOrigins = array_map('trim', $allowedOrigins);
    
    $origin = $request->headers->get('Origin');

    // Check if origin is allowed
    if ($origin && in_array($origin, $allowedOrigins, true)) {
        $response->headers->set('Access-Control-Allow-Origin', $origin);
    } else {
        // For same-origin requests (no Origin header) or null origin
        if (!$origin || $origin === 'null') {
            $response->headers->set('Access-Control-Allow-Origin', $request->getSchemeAndHttpHost());
        } else {
            // Fallback to first allowed origin
            $response->headers->set('Access-Control-Allow-Origin', $allowedOrigins[0] ?? '*');
        }
    }

    $response->headers->set('Vary', 'Origin');
    $response->headers->set('Access-Control-Allow-Credentials', 'true');
    $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
    $response->headers->set('Access-Control-Max-Age', '86400');
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

