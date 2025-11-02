<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RoleMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next, string $roles): Response
    {
        $user = $request->user();
        if (!$user) {
            abort(401);
        }

        // Eager load role to avoid N+1 queries
        $user->loadMissing('role');

        $allowed = collect(explode('|', $roles))
            ->map(fn($r) => trim($r))
            ->filter()
            ->values();

        if ($allowed->isEmpty() || ($user->role && $allowed->contains($user->role->name))) {
            return $next($request);
        }

        abort(403, 'Forbidden');
    }
}
