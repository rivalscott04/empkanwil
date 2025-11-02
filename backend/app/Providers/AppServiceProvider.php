<?php

namespace App\Providers;

use App\Models\Employee;
use App\Models\Coordinate;
use App\Policies\EmployeePolicy;
use App\Policies\CoordinatePolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Employee::class, EmployeePolicy::class);
        Gate::policy(Coordinate::class, CoordinatePolicy::class);
    }
}
