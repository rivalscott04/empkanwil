<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmployeeController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\CoordinateController;

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
	Route::get('/auth/me', [AuthController::class, 'me']);
	Route::post('/auth/logout', [AuthController::class, 'logout']);

	Route::get('/employees', [EmployeeController::class, 'index']);
	Route::get('/employees/induk-units', [EmployeeController::class, 'indukUnits']);
	Route::get('/employees/statistics', [EmployeeController::class, 'statistics']);
	Route::get('/employees/heatmap', [EmployeeController::class, 'heatmap']);
	Route::get('/employees/distinct', [EmployeeController::class, 'distinct']);
	Route::get('/employees/jabatan-options', [EmployeeController::class, 'jabatanOptions']);
	Route::get('/employees/{employee:NIP_BARU}', [EmployeeController::class, 'show']);

	Route::middleware('role:admin')->group(function () {
		Route::post('/employees', [EmployeeController::class, 'store']);
		Route::delete('/employees/{employee:NIP_BARU}', [EmployeeController::class, 'destroy']);

		// Users CRUD (admin only)
		Route::get('/users', [UserController::class, 'index']);
		Route::get('/users/roles', [UserController::class, 'roles']);
		Route::post('/users', [UserController::class, 'store']);
		Route::put('/users/{user}', [UserController::class, 'update']);
		Route::delete('/users/{user}', [UserController::class, 'destroy']);

		// Coordinates CRUD (admin only)
		Route::get('/coordinates', [CoordinateController::class, 'index']);
		Route::get('/coordinates/{coordinate}', [CoordinateController::class, 'show']);
		Route::post('/coordinates', [CoordinateController::class, 'store']);
		Route::put('/coordinates/{coordinate}', [CoordinateController::class, 'update']);
		Route::delete('/coordinates/{coordinate}', [CoordinateController::class, 'destroy']);
	});

	Route::middleware('role:admin|operator')->group(function () {
		Route::put('/employees/{employee:NIP_BARU}', [EmployeeController::class, 'update']);
	});
});
