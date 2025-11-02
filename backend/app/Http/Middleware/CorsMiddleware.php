<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CorsMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        // Handle preflight OPTIONS request
        if ($request->getMethod() === 'OPTIONS') {
            $response = response('', 204);
        } else {
            /** @var Response $response */
            $response = $next($request);
        }

        // Get allowed origins from environment
        $allowedOrigins = explode(',', env('ALLOWED_ORIGINS', 'https://sdm.rivaldev.site,http://localhost:3800'));
        $allowedOrigins = array_map('trim', $allowedOrigins);
        
        $origin = $request->headers->get('Origin');

        // Check if origin is allowed
        if ($origin && in_array($origin, $allowedOrigins, true)) {
            $response->headers->set('Access-Control-Allow-Origin', $origin);
        } else {
            // For same-origin requests (no Origin header) or null origin, allow it if same origin
            if (!$origin || $origin === 'null') {
                // Same-origin request - allow it
                $response->headers->set('Access-Control-Allow-Origin', $request->getSchemeAndHttpHost());
            } else {
                // Reject unauthorized origin
                return response()->json(['error' => 'Unauthorized origin'], 403);
            }
        }

        $response->headers->set('Vary', 'Origin');
        $response->headers->set('Access-Control-Allow-Credentials', 'true');
        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
        $response->headers->set('Access-Control-Max-Age', '86400'); // 24 hours

        return $response;
    }
}


