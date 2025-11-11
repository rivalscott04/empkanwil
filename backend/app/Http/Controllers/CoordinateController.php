<?php

namespace App\Http\Controllers;

use App\Models\Coordinate;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CoordinateController extends Controller
{
    /**
     * Get all coordinates
     */
    public function index()
    {
        $this->authorize('viewAny', Coordinate::class);
        $coordinates = Coordinate::orderBy('induk_unit')->get();
        return response()->json(['success' => true, 'data' => $coordinates]);
    }

    /**
     * Get single coordinate
     */
    public function show(Coordinate $coordinate)
    {
        $this->authorize('view', $coordinate);
        return response()->json(['success' => true, 'data' => $coordinate]);
    }

    /**
     * Create or update coordinate
     */
    public function store(Request $request)
    {
        $this->authorize('create', Coordinate::class);

        $validated = $request->validate([
            'induk_unit' => ['required', 'string', 'max:255'],
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        // Use updateOrCreate to handle both create and update
        $coordinate = Coordinate::updateOrCreate(
            ['induk_unit' => $validated['induk_unit']],
            [
                'latitude' => $validated['latitude'],
                'longitude' => $validated['longitude'],
            ]
        );

        return response()->json(['success' => true, 'data' => $coordinate], 201);
    }

    /**
     * Update coordinate
     */
    public function update(Request $request, Coordinate $coordinate)
    {
        $this->authorize('update', $coordinate);

        $validated = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        $coordinate->update($validated);
        return response()->json(['success' => true, 'data' => $coordinate]);
    }

    /**
     * Delete coordinate
     */
    public function destroy(Coordinate $coordinate)
    {
        $this->authorize('delete', $coordinate);
        $coordinate->delete();
        return response()->json(['success' => true]);
    }
}






