build:
	docker system prune -af --filter "until=24h"
	docker compose build
run:
	docker compose up -d
down:
	docker compose down
