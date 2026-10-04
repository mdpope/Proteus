<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class WorkspaceFactory extends Factory
{
    public function definition(): array
    {
        return ['name' => fake()->company(), 'slug' => fake()->unique()->slug()];
    }
}
