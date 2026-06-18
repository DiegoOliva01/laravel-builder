<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add parse_result JSON column to uploaded_files.
     * Stores the structured output of SqlParserService after processing.
     */
    public function up(): void
    {
        Schema::table('uploaded_files', function (Blueprint $table) {
            $table->json('parse_result')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('uploaded_files', function (Blueprint $table) {
            $table->dropColumn('parse_result');
        });
    }
};
