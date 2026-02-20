.PHONY: dev dev-backend dev-frontend up down migrate seed

# Local development (without Docker)
dev:
	@echo "Starting backend and frontend..."
	make dev-backend & make dev-frontend & wait

dev-backend:
	cd backend && uvicorn app.main:app --reload --port 8000

dev-frontend:
	cd frontend && npm run dev

# Docker
up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

# Database
migrate:
	cd backend && alembic upgrade head

migrate-new:
	cd backend && alembic revision --autogenerate -m "$(msg)"

# Setup
install:
	cd backend && pip install -e ".[dev]"
	cd frontend && npm install

clean:
	docker compose down -v
	rm -rf backend/__pycache__ backend/app/__pycache__
	rm -rf frontend/node_modules frontend/dist
