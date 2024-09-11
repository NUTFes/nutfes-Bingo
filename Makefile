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

db-apply-prod:
	docker compose -f docker-compose.prod.yml exec api hasura metadata apply
	docker compose -f docker-compose.prod.yml exec api hasura migrate apply --database-name default
	docker compose -f docker-compose.prod.yml exec api hasura metadata reload

run-prod:
	docker compose -f docker-compose.prod.yml up -d
	sleep 10
	make db-apply-prod

codegen/user:
	docker compose run --rm view-user npm run codegen

codegen/admin:
	docker compose run --rm view-admin npm run codegen

codegen:
	docker compose run --rm view-user npm run codegen
	docker compose run --rm view-admin npm run codegen
