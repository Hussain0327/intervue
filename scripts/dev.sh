#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting Intervue development environment...${NC}"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}No .env file found. Copying from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}Please update .env with your API keys before proceeding.${NC}"
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "\n${GREEN}Checking prerequisites...${NC}"

if ! command_exists docker; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

if ! command_exists pnpm; then
    echo -e "${YELLOW}pnpm is not installed. Installing...${NC}"
    npm install -g pnpm
fi

if ! command_exists python3; then
    echo -e "${RED}Python 3 is not installed. Please install Python 3.11+${NC}"
    exit 1
fi

# Start infrastructure
echo -e "\n${GREEN}Starting Docker containers (PostgreSQL + Redis)...${NC}"
docker compose up -d

# Wait for PostgreSQL to be ready
echo -e "\n${GREEN}Waiting for PostgreSQL to be ready...${NC}"
until docker compose exec -T postgres pg_isready -U intervue > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e "\n${GREEN}PostgreSQL is ready!${NC}"

# Install Python dependencies
echo -e "\n${GREEN}Installing Python dependencies...${NC}"
cd services/api
if [ ! -d ".venv" ]; then
    python3 -m venv .venv
fi
source .venv/bin/activate
pip install -e ".[dev]" --quiet
cd ../..

# Install Node dependencies
echo -e "\n${GREEN}Installing Node dependencies...${NC}"
pnpm install

# Start services
echo -e "\n${GREEN}Starting services...${NC}"
echo -e "${YELLOW}API will be available at: http://localhost:8000${NC}"
echo -e "${YELLOW}Web will be available at: http://localhost:3000${NC}"
echo -e "${YELLOW}WebSocket endpoint: ws://localhost:8000/ws/interview/{session_id}${NC}"
echo ""
echo -e "${GREEN}Starting in parallel (press Ctrl+C to stop all)...${NC}"
echo ""

# Run API and web concurrently
trap 'kill 0' SIGINT SIGTERM

# Start API
(cd services/api && source .venv/bin/activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000) &

# Start web
(cd apps/web && pnpm dev) &

# Wait for all background processes
wait
