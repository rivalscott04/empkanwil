<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
	public function run(): void
	{
		$roles = collect(['admin','operator','user'])->mapWithKeys(function ($name) {
			return [$name => Role::firstOrCreate(['name' => $name])];
		});

		User::firstOrCreate(
			['email' => 'admin@example.com'],
			['name' => 'Rival', 'password' => Hash::make('password'), 'role_id' => $roles['admin']->id]
		);

		User::firstOrCreate(
			['email' => 'operator@example.com'],
			['name' => 'gekrama', 'password' => Hash::make('rama321#'), 'role_id' => $roles['operator']->id]
		);

		User::firstOrCreate(
			['email' => 'user@example.com'],
			['name' => 'pegawai', 'password' => Hash::make('pegawai*123'), 'role_id' => $roles['user']->id]
		);
	}
}
