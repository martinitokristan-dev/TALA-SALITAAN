<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** A class section / game room. Pupils belong to one section. */
class Section extends Model
{
    protected $fillable = ['name', 'is_active', 'is_demo'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean', 'is_demo' => 'boolean'];
    }

    public function pupils(): HasMany
    {
        return $this->hasMany(Pupil::class);
    }
}
