build:
	docker compose build

run:
	docker compose up -d
	sleep 10
	make db-apply

down:
	docker compose down

db-apply:
	docker compose exec api hasura metadata apply
	docker compose exec api hasura migrate apply --database-name default
	docker compose exec api hasura metadata reload

db-export:
	docker compose exec api hasura metadata export
	docker compose exec api hasura migrate create "auto" --from-server --database-name default
	docker system prune -af --filter "until=24h"
	docker compose build


db-apply-prod:
	docker-compose -f docker-compose.prod.yml exec api hasura metadata apply
	docker-compose -f docker-compose.prod.yml exec api hasura migrate apply --database-name default
	docker-compose -f docker-compose.prod.yml exec api hasura metadata reload

build-prod:
	docker-compose -f docker-compose.prod.yml build

run-prod:
	docker-compose -f docker-compose.prod.yml up -d
	sleep 10
	make db-apply-prod
