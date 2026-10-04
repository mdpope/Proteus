<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const CHECKSUM = '104a5bb288ee2cb3c523d3fb24aeaeea3a2d3f0d191d9bb8db7c1558190ccd76';
    private const TABLES = [
        'proteus_life_schema' => ['columns' => ['version' => 'integer', 'checksum' => 'varchar(64)', 'applied_at' => 'varchar(32)'], 'primary' => ['version'], 'sql' => 'CREATE TABLE IF NOT EXISTS proteus_life_schema (version INTEGER PRIMARY KEY, checksum VARCHAR(64) NOT NULL, applied_at VARCHAR(32) NOT NULL)'],
        'proteus_life_mutations' => ['columns' => ['workspace_id' => 'bigint', 'user_id' => 'bigint', 'idempotency_key' => 'varchar(100)', 'request_hash' => 'varchar(64)', 'result_json' => 'text', 'created_at' => 'varchar(32)'], 'primary' => ['workspace_id', 'user_id', 'idempotency_key'], 'sql' => 'CREATE TABLE IF NOT EXISTS proteus_life_mutations (workspace_id BIGINT NOT NULL, user_id BIGINT NOT NULL, idempotency_key VARCHAR(100) NOT NULL, request_hash VARCHAR(64) NOT NULL, result_json TEXT NOT NULL, created_at VARCHAR(32) NOT NULL, PRIMARY KEY(workspace_id,user_id,idempotency_key))'],
    ];

    public function up(): void
    {
        // Inspect every existing table before issuing any DDL. MariaDB DDL is not transactional.
        foreach (self::TABLES as $table => $definition) if (Schema::hasTable($table)) $this->verify($table, $definition);
        if (Schema::hasTable('proteus_life_schema')) {
            $row = DB::table('proteus_life_schema')->where('version', 2)->first();
            if ($row && ! hash_equals(self::CHECKSUM, $row->checksum)) throw new RuntimeException('The native Life migration checksum does not match. No tables were changed.');
        }
        foreach (self::TABLES as $definition) DB::statement($definition['sql']);
        DB::table('proteus_life_schema')->insertOrIgnore(['version' => 2, 'checksum' => self::CHECKSUM, 'applied_at' => now()->format('Y-m-d H:i:s')]);
    }

    private function verify(string $table, array $definition): void
    {
        $columns = collect(Schema::getColumns($table))->keyBy('name');
        $fail = fn () => throw new RuntimeException('Existing '.$table.' is incompatible. Restore or review it before upgrading; it was not altered.');
        if ($columns->keys()->all() !== array_keys($definition['columns'])) $fail();
        foreach ($definition['columns'] as $name => $expected) {
            $column = $columns[$name]; $type = strtolower($column['type']);
            $type = preg_replace('/^(bigint|int|integer)\(\d+\)$/', '$1', $type);
            if ($type === 'int') $type = 'integer';
            if ($type !== $expected || ($name !== 'version' && $column['nullable'])) $fail();
        }
        $primary = collect(Schema::getIndexes($table))->firstWhere('primary', true);
        if (! $primary || $primary['columns'] !== $definition['primary']) $fail();
    }

    public function down(): void
    {
        // Shared with downloaded desktop apps. Retain replay protection and all user data on rollback.
    }
};
