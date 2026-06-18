<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Services\SqlParserService;

class SqlParserServiceTest extends TestCase
{
    /**
     * Test parsing a basic SQL table.
     */
    public function test_it_can_parse_basic_sql_table(): void
    {
        $sql = "
            CREATE TABLE `users` (
              `id` bigint unsigned NOT NULL AUTO_INCREMENT,
              `name` varchar(255) NOT NULL,
              `email` varchar(255) NOT NULL,
              PRIMARY KEY (`id`)
            );
        ";

        $service = new SqlParserService();
        $result = $service->parse($sql);

        $this->assertCount(1, $result['tables']);
        $this->assertEquals('users', $result['tables'][0]['name']);
        $this->assertCount(3, $result['tables'][0]['columns']);
        
        // Assert first column
        $this->assertEquals('id', $result['tables'][0]['columns'][0]['name']);
        $this->assertEquals('bigint unsigned', $result['tables'][0]['columns'][0]['type']);
        $this->assertTrue($result['tables'][0]['columns'][0]['is_primary']);
    }

    /**
     * Test parsing SQL with foreign keys (relations).
     */
    public function test_it_can_detect_foreign_keys_and_relations(): void
    {
        $sql = "
            CREATE TABLE `users` (
              `id` bigint unsigned NOT NULL AUTO_INCREMENT,
              PRIMARY KEY (`id`)
            );
            CREATE TABLE `posts` (
              `id` bigint unsigned NOT NULL AUTO_INCREMENT,
              `user_id` bigint unsigned NOT NULL,
              `title` varchar(255) NOT NULL,
              PRIMARY KEY (`id`),
              CONSTRAINT `posts_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
            );
        ";

        $service = new SqlParserService();
        $result = $service->parse($sql);

        $this->assertCount(2, $result['tables']);
        
        $postsTable = array_values(array_filter($result['tables'], fn($t) => $t['name'] === 'posts'))[0];
        
        // Check foreign key constraint on the column
        $userIdCol = array_values(array_filter($postsTable['columns'], fn($c) => $c['name'] === 'user_id'))[0];
        $this->assertTrue($userIdCol['is_foreign']);
        $this->assertEquals('users', $userIdCol['references_table']);
        $this->assertEquals('id', $userIdCol['references_column']);

        // Check relations
        $this->assertCount(1, $result['relations']);
        $this->assertEquals('posts', $result['relations'][0]['from_table']);
        $this->assertEquals('user_id', $result['relations'][0]['from_column']);
        $this->assertEquals('users', $result['relations'][0]['to_table']);
    }
}
