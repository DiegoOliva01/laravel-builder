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
        Schema::table('generations', function (Blueprint $table) {
            $table->string('project_name')->nullable()->after('status');
            $table->string('laravel_version')->nullable()->after('project_name');
            $table->string('installation_type')->nullable()->after('laravel_version');
            $table->json('schema_snapshot')->nullable()->after('installation_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('generations', function (Blueprint $table) {
            $table->dropColumn(['project_name', 'laravel_version', 'installation_type', 'schema_snapshot']);
        });
    }
};
