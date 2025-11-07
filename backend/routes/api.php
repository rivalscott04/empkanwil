<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\CoordinateController;

// Login endpoint dengan rate limiting ketat
Route::post('/auth/login', [AuthController::class, 'login'])
	->middleware('throttle:5,1'); // 5 attempts per minute

Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
	Route::get('/auth/me', [AuthController::class, 'me']);
	Route::post('/auth/logout', [AuthController::class, 'logout']);
	Route::post('/auth/refresh', [AuthController::class, 'refresh']);

	Route::get('/employees', [EmployeeController::class, 'index']);
	Route::get('/employees/induk-units', [EmployeeController::class, 'indukUnits']);
	Route::get('/employees/statistics', [EmployeeController::class, 'statistics']);
	Route::get('/employees/heatmap', [EmployeeController::class, 'heatmap']);
	Route::get('/employees/by-location', [EmployeeController::class, 'byLocation']);
	Route::get('/employees/distinct', [EmployeeController::class, 'distinct']);
	Route::get('/employees/jabatan-options', [EmployeeController::class, 'jabatanOptions']);
	Route::get('/employees/{employee:NIP_BARU}', [EmployeeController::class, 'show']);

	// Admin only - rate limiting lebih ketat untuk write operations
	Route::middleware('role:admin')->group(function () {
		Route::post('/employees', [EmployeeController::class, 'store'])
			->middleware('throttle:10,1');
		Route::delete('/employees/{employee:NIP_BARU}', [EmployeeController::class, 'destroy'])
			->middleware('throttle:10,1');

		// Users CRUD (admin only)
		Route::get('/users', [UserController::class, 'index']);
		Route::get('/users/roles', [UserController::class, 'roles']);
		Route::post('/users', [UserController::class, 'store'])
			->middleware('throttle:10,1');
		Route::put('/users/{user}', [UserController::class, 'update'])
			->middleware('throttle:10,1');
		Route::delete('/users/{user}', [UserController::class, 'destroy'])
			->middleware('throttle:10,1');

		// Coordinates CRUD (admin only)
		Route::get('/coordinates', [CoordinateController::class, 'index']);
		Route::get('/coordinates/{coordinate}', [CoordinateController::class, 'show']);
		Route::post('/coordinates', [CoordinateController::class, 'store'])
			->middleware('throttle:10,1');
		Route::put('/coordinates/{coordinate}', [CoordinateController::class, 'update'])
			->middleware('throttle:10,1');
		Route::delete('/coordinates/{coordinate}', [CoordinateController::class, 'destroy'])
			->middleware('throttle:10,1');
	});

	// Admin & Operator - update employees
	// Rate limit lebih tinggi untuk menghindari 429 error
	Route::middleware('role:admin|operator')->group(function () {
		Route::put('/employees/{employee:NIP_BARU}', [EmployeeController::class, 'update'])
			->middleware('throttle:100,1'); // 100 requests per minute
	});
});
