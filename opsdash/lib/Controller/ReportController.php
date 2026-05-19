<?php
declare(strict_types=1);

namespace OCA\Opsdash\Controller;

use OCA\Opsdash\Service\ReportDeliveryService;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\DataResponse;
use OCP\IRequest;
use OCP\IUserSession;
use Psr\Log\LoggerInterface;

final class ReportController extends Controller {
    use CsrfEnforcerTrait;
    use RequestGuardTrait;

    private const MAX_OFFSET = 24;
    private const MAX_CALS = 200;

    public function __construct(
        string $appName,
        IRequest $request,
        private IUserSession $userSession,
        private LoggerInterface $logger,
        private ReportDeliveryService $reportDeliveryService,
    ) {
        parent::__construct($appName, $request);
    }

    #[NoAdminRequired]
    public function testSend(): DataResponse {
        $uid = (string)($this->userSession->getUser()?->getUID() ?? '');
        if ($uid === '') {
            return new DataResponse(['message' => 'unauthorized'], Http::STATUS_UNAUTHORIZED);
        }
        if ($csrf = $this->enforceCsrf()) {
            return $csrf;
        }

        $data = $this->readJsonBodyDefault();
        if ($data instanceof DataResponse) {
            return $data;
        }

        $range = strtolower((string)($data['range'] ?? 'week')) === 'month' ? 'month' : 'week';
        $offset = (int)($data['offset'] ?? -1);
        $offset = max(-self::MAX_OFFSET, min(self::MAX_OFFSET, $offset));

        $requestedCals = null;
        if (isset($data['cals'])) {
            $raw = is_array($data['cals']) ? $data['cals'] : [(string)$data['cals']];
            $requestedCals = array_slice(array_values(array_filter(array_map(
                static fn ($x) => substr(trim((string)$x), 0, 128),
                $raw,
            ), static fn ($x) => $x !== '')), 0, self::MAX_CALS);
        }

        $groupsOverride = is_array($data['groups'] ?? null) ? $data['groups'] : null;
        $targetsConfigOverride = is_array($data['targets_config'] ?? null) ? $data['targets_config'] : null;
        $reportingConfigOverride = is_array($data['reporting_config'] ?? null) ? $data['reporting_config'] : null;

        try {
            $result = $this->reportDeliveryService->sendTestReport(
                $this->appName,
                $uid,
                $range,
                $offset,
                $requestedCals,
                $groupsOverride,
                $targetsConfigOverride,
                $reportingConfigOverride,
            );
        } catch (\InvalidArgumentException $e) {
            return new DataResponse(['message' => $e->getMessage()], Http::STATUS_BAD_REQUEST);
        } catch (\Throwable $e) {
            $this->logger->error('opsdash test report send failed: ' . $e->getMessage(), [
                'app' => $this->appName,
                'exception' => $e,
            ]);
            return new DataResponse(['message' => 'error'], Http::STATUS_INTERNAL_SERVER_ERROR);
        }

        return new DataResponse([
            'ok' => true,
            'email' => $result['email'],
            'subject' => $result['subject'],
            'summary' => $result['summary'],
        ], Http::STATUS_OK);
    }
}
