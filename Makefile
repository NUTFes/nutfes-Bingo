build:
	docker compose build

run:
	docker compose up -d
	
down:
	docker compose down

db-apply:
	docker compose exec api hasura metadata apply

db-export:
	sudo rm -rf migrations/default/**
	docker compose exec api hasura metadata export
	docker compose exec api hasura migrate create "auto" --from-server --database-name default