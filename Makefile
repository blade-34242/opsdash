APP_NAME := opsdash
SRC_DIR := $(APP_NAME)
BUILD_DIR := build
DIST_DIR := $(BUILD_DIR)/dist
APP_BUILD_DIR := $(BUILD_DIR)/$(APP_NAME)
VERSION ?= $(shell sed -n 's/.*<version>\(.*\)<\/version>.*/\1/p' $(SRC_DIR)/appinfo/info.xml | head -n 1)

.PHONY: clean deps build test appstore sign upload appstore-push release
.PHONY: smoke start start31 start32 start33 start34 stop status logs

clean:
	@echo "[make] Cleaning build artifacts"
	rm -rf $(BUILD_DIR)

deps:
	@echo "[make] Installing npm + composer dependencies"
	cd $(SRC_DIR) && npm ci
	cd $(SRC_DIR) && composer install

build:
	@echo "[make] Building SPA assets"
	cd $(SRC_DIR) && npm run build

start:
	@echo "[make] Starting Nextcloud 33 dev stack on http://localhost:8093"
	docker compose up -d nextcloud33

start34:
	@echo "[make] Starting Nextcloud 34 dev stack on http://localhost:8095"
	docker compose up -d nextcloud34

start33:
	@echo "[make] Starting Nextcloud 33 dev stack on http://localhost:8093"
	docker compose up -d nextcloud33

start32:
	@echo "[make] Starting Nextcloud 32 dev stack on http://localhost:8092"
	docker compose up -d nextcloud32

start31:
	@echo "[make] Starting Nextcloud 31 dev stack on http://localhost:8088"
	docker compose up -d nextcloud31

stop:
	@echo "[make] Stopping local dev stack"
	docker compose down

status:
	@echo "[make] Local dev stack status"
	docker compose ps

logs:
	@echo "[make] Tail logs for Nextcloud 33 dev stack"
	docker compose logs --no-color --tail=80 nextcloud33

# Minimal unit tests (Vitest + PHPUnit). Playwright runs in CI against a real NC instance.
test:
	@echo "[make] Running Vitest"
	cd $(SRC_DIR) && npm run test -- --run
	@echo "[make] Running PHPUnit"
	cd $(SRC_DIR) && composer run test:unit

# Docker-based smoke check against a running Nextcloud container.
# Override defaults: `make smoke NC_CONTAINER=nc33-dev NC_USER=admin NC_PASS=admin`
smoke:
	@echo "[make] Smoke checking Nextcloud /overview/load"
	NC_CONTAINER="$(NC_CONTAINER)"; \
	NC_USER="$${NC_USER:-admin}"; \
	NC_PASS="$${NC_PASS:-admin}"; \
	NC_CONTAINER="$${NC_CONTAINER:-nc33-dev}"; \
	bash $(SRC_DIR)/tools/smoke_overview_load.sh "$$NC_CONTAINER" "$$NC_USER" "$$NC_PASS"

release:
	@if [ -z "$(VERSION)" ]; then echo "VERSION is required (pass VERSION=x.y.z)" >&2; exit 1; fi
	@echo "[make] Bumping app version to $(VERSION)"
	bash tools/release/bump_version.sh "$(VERSION)"
	@echo "[make] Building signed-package staging artifact for $(VERSION)"
	$(MAKE) appstore VERSION=$(VERSION)

sign:
	@if [ -z "$(VERSION)" ]; then echo "VERSION is required (pass VERSION=x.y.z)" >&2; exit 1; fi
	@if [ -z "$(SIGN_PRIVATE_KEY_FILE)" ]; then echo "SIGN_PRIVATE_KEY_FILE is required" >&2; exit 1; fi
	@if [ -z "$(SIGN_CERT_FILE)" ]; then echo "SIGN_CERT_FILE is required" >&2; exit 1; fi
	@echo "[make] Signing app package for $(VERSION)"
	VERSION="$(VERSION)" SIGN_PRIVATE_KEY_FILE="$(SIGN_PRIVATE_KEY_FILE)" SIGN_CERT_FILE="$(SIGN_CERT_FILE)" SIGN_SERVICE="$(SIGN_SERVICE)" SIGN_CONTAINER="$(SIGN_CONTAINER)" bash tools/release/sign_app.sh

upload:
	@if [ -z "$(VERSION)" ]; then echo "VERSION is required (pass VERSION=x.y.z)" >&2; exit 1; fi
	@echo "[make] Uploading signed package for $(VERSION)"
	VERSION="$(VERSION)" RELEASE_TAG="$(RELEASE_TAG)" bash tools/release/upload_release.sh

appstore-push:
	@if [ -z "$(VERSION)" ]; then echo "VERSION is required (pass VERSION=x.y.z)" >&2; exit 1; fi
	@if [ "$(APPSTORE_DRY_RUN)" != "1" ] && [ "$(APPSTORE_DRY_RUN)" != "true" ] && [ -z "$(APPSTORE_TOKEN)" ]; then echo "APPSTORE_TOKEN is required" >&2; exit 1; fi
	@echo "[make] Publishing release to Nextcloud App Store for $(VERSION)"
	VERSION="$(VERSION)" RELEASE_TAG="$(RELEASE_TAG)" APPSTORE_TOKEN="$(APPSTORE_TOKEN)" APPSTORE_URL="$(APPSTORE_URL)" APPSTORE_NIGHTLY="$(APPSTORE_NIGHTLY)" APPSTORE_DRY_RUN="$(APPSTORE_DRY_RUN)" DOWNLOAD_URL="$(DOWNLOAD_URL)" APP_PRIVATE_KEY_FILE="$(APP_PRIVATE_KEY_FILE)" SIGN_PRIVATE_KEY_FILE="$(SIGN_PRIVATE_KEY_FILE)" RELEASE_REPO="$(RELEASE_REPO)" RELEASE_TOKEN="$(RELEASE_TOKEN)" bash tools/release/appstore_push.sh

appstore: clean
	@if [ -z "$(VERSION)" ]; then echo "VERSION is required (pass VERSION=x.y.z)" >&2; exit 1; fi
	@echo "[make] Preparing appstore package for $(VERSION)"
	mkdir -p $(APP_BUILD_DIR)
	rsync -a --delete \
	  --exclude='.git' --exclude='.github' --exclude='.idea' --exclude='.vscode' \
	  --exclude='node_modules' --exclude='.vite' --exclude='dist' \
	  --exclude='playwright-report' --exclude='test-results' \
	  --exclude='docs-private' \
	  $(SRC_DIR)/ $(APP_BUILD_DIR)/
	cd $(APP_BUILD_DIR) && npm ci
	cd $(APP_BUILD_DIR) && npm run build
	cd $(APP_BUILD_DIR) && composer install --no-dev --prefer-dist --optimize-autoloader
	@echo "[make] Removing dev artifacts"
	rm -rf $(APP_BUILD_DIR)/node_modules \
	  $(APP_BUILD_DIR)/test $(APP_BUILD_DIR)/tests \
	  $(APP_BUILD_DIR)/playwright-report $(APP_BUILD_DIR)/test-results \
	  $(APP_BUILD_DIR)/.vscode $(APP_BUILD_DIR)/.idea \
	  $(APP_BUILD_DIR)/.github $(APP_BUILD_DIR)/tools \
	  $(APP_BUILD_DIR)/docker-compose*.yml $(APP_BUILD_DIR)/Dockerfile \
	  $(APP_BUILD_DIR)/src $(APP_BUILD_DIR)/docs $(APP_BUILD_DIR)/docs-private \
	  $(APP_BUILD_DIR)/composables
	rm -f $(APP_BUILD_DIR)/package-lock.json $(APP_BUILD_DIR)/pnpm-lock.yaml $(APP_BUILD_DIR)/yarn.lock \
	  $(APP_BUILD_DIR)/playwright.config.ts $(APP_BUILD_DIR)/tsconfig.json \
	  $(APP_BUILD_DIR)/vite.config.ts $(APP_BUILD_DIR)/vitest.config.ts \
	  $(APP_BUILD_DIR)/phpstan.neon.dist \
	  $(APP_BUILD_DIR)/vendor/bin/.phpunit.result.cache \
	  $(APP_BUILD_DIR)/vendor/composer/tmp-*
	@echo "[make] Creating tarball"
	mkdir -p $(DIST_DIR)
	tar -czf $(DIST_DIR)/$(APP_NAME)-$(VERSION).tar.gz -C $(BUILD_DIR) $(APP_NAME)
	@echo "[make] Package ready: $(DIST_DIR)/$(APP_NAME)-$(VERSION).tar.gz"
	@echo "[make] Signing step (uncomment once certificates are available):"
	@echo "# occ integrity:sign-app --path $(DIST_DIR)/$(APP_NAME) --privateKey /path/key.pem --certificate /path/cert.crt"
