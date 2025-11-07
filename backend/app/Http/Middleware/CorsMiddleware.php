<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CorsMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        // Get allowed origins from environment
        $allowedOrigins = explode(',', env('ALLOWED_ORIGINS', 'https://sdm.rivaldev.site,http://localhost:3800'));
        $allowedOrigins = array_map('trim', $allowedOrigins);
        
        $origin = $request->headers->get('Origin');

        // Handle preflight OPTIONS request
        if ($request->getMethod() === 'OPTIONS') {
            $response = response('', 204);
            $this->addCorsHeaders($response, $origin, $allowedOrigins, $request);
            return $response;
        }

        try {
            /** @var Response $response */
            $response = $next($request);
        } catch (\Throwable $e) {
            // Jika terjadi exception, buat response error dengan CORS headers
            $response = response()->json([
                'success' => false,
                'message' => app()->environment('production') 
                    ? 'Internal Server Error' 
                    : $e->getMessage(),
                'error_code' => 500,
            ], 500);
        }

        // Selalu tambahkan CORS headers, bahkan pada error response
        $this->addCorsHeaders($response, $origin, $allowedOrigins, $request);

        return $response;
    }

    /**
     * Add CORS headers to response
     */
    private function addCorsHeaders(Response $response, ?string $origin, array $allowedOrigins, Request $request): void
    {
        // Check if origin is allowed
        if ($origin && in_array($origin, $allowedOrigins, true)) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
        } else {
            // For same-origin requests (no Origin header) or null origin, allow it if same origin
            if (!$origin || $origin === 'null') {
                // Same-origin request - allow it
                $response->headers->set('Access-Control-Allow-Origin', $request->getSchemeAndHttpHost());
            } else {
                // Jika origin tidak diizinkan, tetap set header untuk menghindari CORS error
                // Browser akan tetap memblokir, tapi setidaknya response tidak kosong
                $response->headers->set('Access-Control-Allow-Origin', $allowedOrigins[0] ?? '*');
            }
        }

        $response->headers->set('Vary', 'Origin');
        $response->headers->set('Access-Control-Allow-Credentials', 'true');
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
        $response->headers->set('Access-Control-Max-Age', '86400'); // 24 hours
    }
}


