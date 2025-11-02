<?php

namespace App\Http;

use Illuminate\Foundation\Http\Kernel as HttpKernel;

class Kernel extends HttpKernel
{
	/**
	 * The application's route middleware aliases.
	 *
	 * @var array<string, class-string|string>
	 */
	protected $middlewareAliases = [
		'auth' => \App\Http\Middleware\Authenticate::class,
		'auth.basic' => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,
		'auth.session' => \Illuminate\Session\Middleware\AuthenticateSession::class,
		'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class,
		'can' => \Illuminate\Auth\Middleware\Authorize::class,
		'guest' => \App\Http\Middleware\RedirectIfAuthenticated::class,
		'password.confirm' => \Illuminate\Auth\Middleware\RequirePassword::class,
		'precognitive' => \Illuminate\Foundation\Http\Middleware\HandlePrecognitiveRequests::class,
		'signed' => \App\Http\Middleware\ValidateSignature::class,
		'role' => \App\Http\Middleware\RoleMiddleware::class,
		'auth.sanctum' => \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
		'auth:sanctum' => \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
		'throttle' => \Illuminate\Routing\Middleware\ThrottleRequests::class,
		'validate.signature' => \Illuminate\Routing\Middleware\ValidateSignature::class,
	];
}
