<?php
declare(strict_types=1);

namespace OCA\Opsdash\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\IRequest;
use OCP\IUserSession;
use OCP\IConfig;
use Psr\Log\LoggerInterface;

use OCA\Opsdash\Service\UserConfigService;
use OCA\Opsdash\Service\OverviewLoadService;
use OCA\Opsdash\Service\OverviewIncludeResolver;
use OCA\Opsdash\Service\ViteAssetsService;
use OCA\Opsdash\Service\DashboardDefaultsService;
use OCA\Opsdash\Service\LoadRateLimiter;

final class OverviewController extends Controller {
    use CsrfEnforcerTrait;
    use RequestGuardTrait;

    private const MAX_OFFSET = 24;
    private const MAX_CALS_PARAM = 200;
    private const MAX_INCLUDE_PARAM = 20;
    private const MAX_VALUE_LEN = 128;
    private const MAX_CSV_LEN = 4096;
    private const MAX_QUERY_BYTES = 4096;

    public function __construct(
        string $appName,
        IRequest $request,
        private LoggerInterface $logger,
        private IUserSession $userSession,
        private IConfig $config,
        private ViteAssetsService $viteAssetsService,
        private UserConfigService $userConfigService,
        private OverviewLoadService $loadService,
        private OverviewIncludeResolver $includeResolver,
        private DashboardDefaultsService $dashboardDefaultsService,
        private LoadRateLimiter $rateLimiter,
    ) {
        parent::__construct($appName, $request);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function index(): TemplateResponse {
        // Load bundled frontend (CSS + JS)
        // CSS first to align with strict CSP (avoid runtime style injection)
        try {
            $assets = $this->viteAssetsService->resolveBuiltAssets($this->appName);
        } catch (\Throwable $e) {
            $this->logger->error('Failed to resolve Opsdash frontend assets', [
                'exception' => $e,
            ]);
            throw $e instanceof \RuntimeException ? $e : new \RuntimeException('Failed to resolve frontend assets', 0, $e);
        }
        \OCP\Util::addStyle($this->appName, 'style');
        foreach ($assets['styles'] as $style) {
            \OCP\Util::addStyle($this->appName, $style);
        }
        \OCP\Util::addScript($this->appName, $assets['script']);
        // Expose version and optional changelog URL to template
        $version = $this->resolveAppVersion();
        $changelog = '';
        try {
            $changelog = (string)$this->config->getAppValue($this->appName, 'changelog_url', '');
        } catch (\Throwable) { }
        $uid = (string)($this->userSession->getUser()?->getUID() ?? '');
        $bootstrapTheme = 'auto';
        if ($uid !== '') {
            try {
                $bootstrapTheme = $this->userConfigService->readThemePreference($this->appName, $uid);
            } catch (\Throwable) {
                $bootstrapTheme = 'auto';
            }
        }
        $defaultWidgets = [];
        try {
            $defaultWidgets = $this->dashboardDefaultsService->getPresets();
        } catch (\Throwable) {
            $defaultWidgets = [];
        }

        return new TemplateResponse($this->appName, 'overview', [
            'version' => $version,
            'changelog' => $changelog,
            'themePreference' => $bootstrapTheme,
            'defaultWidgets' => $defaultWidgets,
        ]);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function ping(): DataResponse {
        $version = $this->resolveAppVersion();
        $changelog = '';
        try { $changelog = (string)$this->config->getAppValue($this->appName, 'changelog_url', ''); } catch (\Throwable) {}
        return new DataResponse([
            'ok' => true,
            'app' => $this->appName,
            'version' => $version,
            'changelog' => $changelog,
            'ts' => time(),
        ], Http::STATUS_OK);
    }

    #[NoAdminRequired]
    #[NoCSRFRequired]
    public function load(): DataResponse {
        $uid = (string)($this->userSession->getUser()?->getUID() ?? '');
        if ($uid === '') return new DataResponse(['message' => 'unauthorized'], Http::STATUS_UNAUTHORIZED);

        $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        if ($method !== 'GET') {
            return new DataResponse(['message' => 'method not allowed'], Http::STATUS_METHOD_NOT_ALLOWED);
        }

        if ($guard = $this->enforceQueryLength(self::MAX_QUERY_BYTES)) {
            return $guard;
        }

        $input = [
            'range' => $this->request->getParam('range', 'week'),
            'offset' => $this->request->getParam('offset', 0),
            'cals' => $this->request->getParam('cals', null),
            'calsCsv' => $this->request->getParam('calsCsv', null),
            'include' => $this->request->getParam('include', []),
            'debug' => $this->request->getParam('debug', false),
            'onboarding' => $this->request->getParam('onboarding', null),
        ];
        $params = $this->parseLoadParams($input, ['core']);
        if ($this->includesData($params['include'])) {
            return new DataResponse(['message' => 'use POST to load data'], Http::STATUS_METHOD_NOT_ALLOWED);
        }

        $payload = $this->loadService->load($this->appName, $uid, $params);
        return new DataResponse($payload, Http::STATUS_OK);
    }

    #[NoAdminRequired]
    public function loadData(): DataResponse {
        $uid = (string)($this->userSession->getUser()?->getUID() ?? '');
        if ($uid === '') return new DataResponse(['message' => 'unauthorized'], Http::STATUS_UNAUTHORIZED);
        if ($csrf = $this->enforceCsrf()) {
            return $csrf;
        }
        $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        if ($method !== 'POST') {
            return new DataResponse(['message' => 'method not allowed'], Http::STATUS_METHOD_NOT_ALLOWED);
        }
        if (!$this->rateLimiter->allow($uid)) {
            return new DataResponse(['message' => 'too many requests'], 429);
        }
        $data = $this->readJsonBodyDefault();
        if ($data instanceof DataResponse) {
            return $data;
        }
        $params = $this->parseLoadParams($data, []);
        $payload = $this->loadService->load($this->appName, $uid, $params);
        return new DataResponse($payload, Http::STATUS_OK);
    }

    /**
     * @param array<string,mixed> $input
     * @param string[] $defaultInclude
     * @return array<string,mixed>
     */
    private function parseLoadParams(array $input, array $defaultInclude): array {
        $calsParam = $input['cals'] ?? null;
        $calsCsv = $input['calsCsv'] ?? null;
        $provided = ($calsParam !== null) || ($calsCsv !== null);
        $cals = [];
        if (is_array($calsParam)) {
            $cals = $calsParam;
        } elseif (is_string($calsParam) && $calsParam !== '') {
            $cals = [$calsParam];
        } elseif (is_string($calsCsv) && $calsCsv !== '') {
            $csv = substr($calsCsv, 0, self::MAX_CSV_LEN);
            $cals = explode(',', $csv);
        }
        $cals = $this->sanitizeIdList($cals, self::MAX_CALS_PARAM);

        $includeParam = $input['include'] ?? [];
        $include = [];
        if (is_array($includeParam)) {
            $include = $includeParam;
        } elseif (is_string($includeParam) && $includeParam !== '') {
            $csv = substr($includeParam, 0, self::MAX_CSV_LEN);
            $include = preg_split('/\s*,\s*/', $csv) ?: [];
        }
        $include = $this->includeResolver->sanitizeInputList($include, self::MAX_INCLUDE_PARAM);
        if (empty($include) && !empty($defaultInclude)) {
            $include = $defaultInclude;
        }

        $range  = strtolower((string)($input['range'] ?? 'week'));
        if ($range !== 'month') $range = 'week';
        $offset = (int)($input['offset'] ?? 0);
        if ($offset > self::MAX_OFFSET) $offset = self::MAX_OFFSET; elseif ($offset < -self::MAX_OFFSET) $offset = -self::MAX_OFFSET;
        $onboardingParam = $input['onboarding'] ?? null;
        $forceReset = is_string($onboardingParam) && strtolower((string)$onboardingParam) === 'reset';

        return [
            'range' => $range,
            'offset' => $offset,
            'provided' => $provided,
            'cals' => $provided ? $cals : null,
            'debug' => (bool)($input['debug'] ?? false),
            'forceReset' => $forceReset,
            'include' => $include,
        ];
    }

    /**
     * @param array<int,mixed> $values
     * @return array<int,string>
     */
    private function sanitizeIdList(array $values, int $max): array {
        $out = [];
        foreach ($values as $value) {
            $v = substr(trim((string)$value), 0, self::MAX_VALUE_LEN);
            if ($v === '') continue;
            $out[] = $v;
            if (count($out) >= $max) {
                break;
            }
        }
        return array_values(array_unique($out));
    }

    /**
     * @param array<int,string> $include
     */
    private function includesData(array $include): bool {
        if (empty($include)) {
            return true;
        }
        $set = array_fill_keys(array_map('strtolower', $include), true);
        if (isset($set['all']) || isset($set['data'])) {
            return true;
        }
        foreach (['stats', 'bycal', 'byday', 'longest', 'charts', 'lookback'] as $key) {
            if (isset($set[$key])) {
                return true;
            }
        }
        return false;
    }

    private function resolveAppVersion(): string {
        try {
            $infoPath = dirname(__DIR__, 2) . '/appinfo/info.xml';
            $xml = @file_get_contents($infoPath);
            if (!is_string($xml) || $xml === '') {
                return '';
            }
            if (preg_match('/<version>([^<]+)<\/version>/', $xml, $matches) === 1) {
                return trim((string)$matches[1]);
            }
        } catch (\Throwable) {
        }
        return '';
    }

}
