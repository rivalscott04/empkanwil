<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: 'api',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Apply CORS headers for API
        $middleware->append(\App\Http\Middleware\CorsMiddleware::class);

        // Route middleware aliases (Laravel 11 style)
        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn(Request $request) => $request->is('api/*') || $request->wantsJson()
        );

        // Custom API exception handling - hide sensitive errors in production
        $exceptions->render(function (\Throwable $e, Request $request) {
            if ($request->is('api/*') || $request->wantsJson()) {
                // Only use custom handler if function exists (after composer dump-autoload)
                if (function_exists('App\Helpers\handleApiException')) {
                    return \App\Helpers\handleApiException($request, $e);
                }
                // Fallback to default Laravel JSON exception handling
                $statusCode = method_exists($e, 'getStatusCode') ? $e->getStatusCode() : 500;
                $message = app()->environment('production') 
                    ? 'An error occurred' 
                    : $e->getMessage();
                
                return response()->json([
                    'success' => false,
                    'message' => $message,
                    'error_code' => $statusCode,
                ], $statusCode);
            }
        });
    })
    ->create();
