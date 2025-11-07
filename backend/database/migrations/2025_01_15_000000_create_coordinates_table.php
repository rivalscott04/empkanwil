<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('coordinates', function (Blueprint $table) {
            $table->id();
            $table->string('induk_unit')->unique(); // e.g., "Kantor Kementerian Agama Kota Mataram"
            $table->decimal('latitude', 10, 8); // lat coordinate
            $table->decimal('longitude', 11, 8); // lng coordinate
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('coordinates');
    }
};


