.PHONY: dev setup install clean test lint docker-up docker-down api web

# Development
dev:
	./scripts/dev.sh

setup:
	cp -n .env.example .env || true
	@echo "Starting Docker containers (skip with make setup-no-docker)..."
	docker compose up -d
	cd services/api && python3 -m venv .venv && . .venv/bin/activate && pip install -e ".[dev]"
	pnpm install

setup-no-docker:
	cp -n .env.example .env || true
	@echo "Skipping Docker - make sure PostgreSQL and Redis are running separately"
	cd services/api && python3 -m venv .venv && . .venv/bin/activate && pip install -e ".[dev]"
	pnpm install

# Installation
install:
	cd services/api && pip install -e ".[dev]"
	pnpm install

# Docker
docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

# API Server
api:
	cd services/api && . .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Web Frontend
web:
	cd apps/web && pnpm dev

# Testing
test:
	cd services/api && . .venv/bin/activate && pytest -v

test-cov:
	cd services/api && . .venv/bin/activate && pytest --cov=app --cov-report=html

# Linting
lint:
	cd services/api && . .venv/bin/activate && ruff check app
	cd apps/web && pnpm lint

lint-fix:
	cd services/api && . .venv/bin/activate && ruff check --fix app

# Database
migrate:
	cd services/api && . .venv/bin/activate && alembic upgrade head

migrate-new:
	@read -p "Migration message: " msg; \
	cd services/api && . .venv/bin/activate && alembic revision --autogenerate -m "$$msg"

# Cleanup
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true

# Help
help:
	@echo "Available commands:"
	@echo "  make dev          - Start full development environment"
	@echo "  make setup        - Initial setup (Docker, venv, deps)"
	@echo "  make install      - Install dependencies only"
	@echo "  make docker-up    - Start Docker containers"
	@echo "  make docker-down  - Stop Docker containers"
	@echo "  make api          - Start API server only"
	@echo "  make web          - Start web frontend only"
	@echo "  make test         - Run tests"
	@echo "  make lint         - Run linters"
	@echo "  make migrate      - Run database migrations"
	@echo "  make clean        - Clean build artifacts"
