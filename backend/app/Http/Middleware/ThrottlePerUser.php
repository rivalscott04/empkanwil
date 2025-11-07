<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class ThrottlePerUser extends ThrottleRequests
{
    /**
     * Resolve request signature untuk throttle per user ID
     */
    protected function resolveRequestSignature(Request $request): string
    {
        // Jika user sudah authenticated, gunakan user ID sebagai key
        if ($user = $request->user()) {
            return sha1($user->id . '|' . $request->ip());
        }
        
        // Fallback ke IP jika tidak authenticated
        return sha1($request->ip());
    }
}

