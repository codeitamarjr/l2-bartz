<?php

namespace App\Services\L2j;

/**
 * Reads the game server's config overrides (overrides/game/config, mounted read-only). A key missing there
 * means the server runs L2J's default, which callers pass as the fallback.
 */
class GameConfig
{
    /** @var array<string, array<string, string>> */
    private array $files = [];

    public function get(string $file, string $key, string $default): string
    {
        return $this->properties($file)[$key] ?? $default;
    }

    public function number(string $file, string $key, float $default): float
    {
        return (float) $this->get($file, $key, (string) $default);
    }

    public function flag(string $file, string $key, bool $default): bool
    {
        return strtolower($this->get($file, $key, $default ? 'True' : 'False')) === 'true';
    }

    /**
     * @return array<string, string>
     */
    private function properties(string $file): array
    {
        if (isset($this->files[$file])) {
            return $this->files[$file];
        }

        $path = rtrim((string) config('l2j.config_dir'), '/').'/'.$file;
        $properties = [];

        if (is_readable($path)) {
            foreach (file($path, FILE_IGNORE_NEW_LINES) ?: [] as $line) {
                if (preg_match('/^\s*([A-Za-z0-9_.]+)\s*=\s*(.*?)\s*$/', $line, $match)) {
                    $properties[$match[1]] = $match[2];
                }
            }
        }

        return $this->files[$file] = $properties;
    }
}
