<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
	public function login(Request $request)
	{
		$credentials = $request->validate([
			'identifier' => ['required','string'],
			'password' => ['required'],
		]);

		// Try to find user by email or username (name) - case insensitive
		$user = User::with('role')->where(function($query) use ($credentials) {
			$query->where('email', $credentials['identifier'])
				->orWhereRaw('LOWER(name) = ?', [strtolower($credentials['identifier'])]);
		})->first();

		if (!$user || !Hash::check($credentials['password'], $user->password)) {
			throw ValidationException::withMessages([
				'identifier' => ['The provided credentials are incorrect.'],
			]);
		}

		// create personal access token
		$token = $user->createToken('web')->plainTextToken;

		return response()->json([
			'success' => true,
			'data' => [
				'access_token' => $token,
				'token_type' => 'Bearer',
				'user' => [
					'id' => $user->id,
					'name' => $user->name,
					'email' => $user->email,
					'role' => $user->role?->name,
				],
			],
		]);
	}

	public function me(Request $request)
	{
		$user = $request->user()->loadMissing('role');
		return response()->json([
			'success' => true,
			'data' => [
				'id' => $user->id,
				'name' => $user->name,
				'email' => $user->email,
				'role' => $user->role?->name,
			],
		]);
	}

	public function logout(Request $request)
	{
		$request->user()->currentAccessToken()?->delete();
		return response()->json(['success' => true]);
	}

	public function refresh(Request $request)
	{
		$user = $request->user()->loadMissing('role');
		
		// Delete current token
		$request->user()->currentAccessToken()?->delete();
		
		// Create new token
		$token = $user->createToken('web')->plainTextToken;
		
		return response()->json([
			'success' => true,
			'data' => [
				'access_token' => $token,
				'token_type' => 'Bearer',
				'user' => [
					'id' => $user->id,
					'name' => $user->name,
					'email' => $user->email,
					'role' => $user->role?->name,
				],
			],
		]);
	}
}
