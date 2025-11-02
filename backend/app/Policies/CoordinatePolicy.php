<?php

namespace App\Policies;

use App\Models\Coordinate;
use App\Models\User;

class CoordinatePolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true; // Everyone can view coordinates
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Coordinate $coordinate): bool
    {
        return true;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->role?->name === 'admin';
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Coordinate $coordinate): bool
    {
        return $user->role?->name === 'admin';
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Coordinate $coordinate): bool
    {
        return $user->role?->name === 'admin';
    }
}

