<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request)
    {

        $perPage = (int)($request->query('per_page', 15));
        $search = trim($request->query('search', ''));

        $query = User::with('role');
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhere('email', 'like', "%$search%");
            });
        }

        $paginated = $query->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $paginated,
        ]);
    }

    public function roles()
    {
        $roles = Role::query()->select('id','name')->orderBy('name')->get();
        return response()->json(['success' => true, 'data' => $roles]);
    }

    public function store(Request $request)
    {

        $data = $request->validate([
            'name' => ['required','string','max:255'],
            'email' => ['required','email','max:255', 'unique:users,email'],
            'password' => ['required','string','min:6'],
            'role_id' => ['required', Rule::exists('roles','id')],
        ]);

        $user = User::create($data);
        $user->load('role');
        return response()->json(['success' => true, 'data' => $user], 201);
    }

    public function update(Request $request, User $user)
    {

        $data = $request->validate([
            'name' => ['sometimes','required','string','max:255'],
            'email' => ['sometimes','required','email','max:255', Rule::unique('users','email')->ignore($user->id)],
            'password' => ['nullable','string','min:6'],
            'role_id' => ['sometimes','required', Rule::exists('roles','id')],
        ]);

        // Empty string for password means do not change
        if (array_key_exists('password', $data) && ($data['password'] === null || $data['password'] === '')) {
            unset($data['password']);
        }

        $user->fill($data);
        $user->save();
        $user->load('role');
        return response()->json(['success' => true, 'data' => $user]);
    }

    public function destroy(User $user)
    {
        $user->delete();
        return response()->json(['success' => true]);
    }
}


