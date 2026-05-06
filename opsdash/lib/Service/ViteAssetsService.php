<?php
declare(strict_types=1);

namespace OCA\Opsdash\Service;

use JsonException;

final class ViteAssetsService {
    /**
     * Resolve built asset names (script + styles) from the Vite manifest.
     *
     * @return array{script: string, styles: string[]}
     */
    public function resolveBuiltAssets(string $appName): array {
        $appPath = dirname(__DIR__, 2);
        $manifestPath = $appPath . '/js/.vite/manifest.json';
        if (!is_readable($manifestPath)) {
            throw new \RuntimeException('Vite manifest not found: ' . $manifestPath);
        }
        $raw = @file_get_contents($manifestPath);
        if ($raw === false) {
            throw new \RuntimeException('Failed to read Vite manifest: ' . $manifestPath);
        }
        try {
            $json = json_decode($raw, true, flags: JSON_THROW_ON_ERROR);
        } catch (JsonException $e) {
            throw new \RuntimeException('Invalid Vite manifest JSON: ' . $manifestPath, 0, $e);
        }
        if (!isset($json['src/main.ts']) || !is_array($json['src/main.ts'])) {
            throw new \RuntimeException('Vite manifest missing entry for src/main.ts');
        }
        $entry = $json['src/main.ts'];
        $scriptFile = isset($entry['file']) && is_string($entry['file']) ? trim($entry['file']) : '';
        if ($scriptFile === '') {
            throw new \RuntimeException('Vite manifest entry for src/main.ts is missing "file"');
        }
        $scriptPath = preg_replace('/\.js$/', '', $scriptFile);
        if ($scriptPath === '' || $scriptPath === $scriptFile) {
            throw new \RuntimeException('Unexpected script filename in manifest: ' . $scriptFile);
        }
        if (!preg_match('/^assets\/[a-zA-Z0-9._-]+$/', $scriptPath)) {
            throw new \RuntimeException('Unsafe script path in manifest: ' . $scriptPath);
        }
        $styles = [];
        if (isset($entry['css']) && is_array($entry['css'])) {
            foreach ($entry['css'] as $cssPath) {
                if (!is_string($cssPath) || $cssPath === '') {
                    continue;
                }
                $css = preg_replace('/\.css$/', '', $cssPath);
                if ($css !== '' && $css !== $cssPath && preg_match('/^assets\/[a-zA-Z0-9._-]+$/', $css)) {
                    $styles[] = $css;
                }
            }
        }

        return [
            'script' => $scriptPath,
            'styles' => $styles,
        ];
    }

}
