run:
	docker compose up -d --build
	sleep 20
	make db-apply

down:
	docker compose down

db/status:
	docker compose exec api hasura migrate status --database-name default

db/apply:
	docker compose exec api hasura metadata apply
	docker compose exec api hasura migrate apply --database-name default
	docker compose exec api hasura metadata reload

db/export:
	docker compose exec api hasura metadata export
	docker compose exec api hasura migrate create "auto" --from-server --database-name default

db/migration:
	./migration.sh squash
	./migration.sh clean
	./migration.sh apply
	./migration.sh reload

db/apply/prod:
	docker compose -f docker-compose.prod.yml exec api hasura metadata apply
	docker compose -f docker-compose.prod.yml exec api hasura migrate apply --database-name default
	docker compose -f docker-compose.prod.yml exec api hasura metadata reload

run/prod:
	docker compose -f docker-compose.prod.yml up -d
	sleep 10
	make db-apply-prod

# MinIO credentials management
generate-minio-keys:
	cd api/seeds && ./generate_minio_credentials.sh

# Seed data commands
seed:
	cd api/seeds && ./seed_with_existing_images.sh

# Complete setup with new MinIO credentials and seed data
setup:
	make run
	make generate-minio-keys
	@echo "🔄 Restarting containers to apply new credentials..."
	docker compose restart
	sleep 10
	make seed

codegen/user:
	docker compose run --rm view-user npm run codegen

codegen/admin:
	docker compose run --rm view-admin npm run codegen

codegen:
	docker compose run --rm view-user npm run codegen
	docker compose run --rm view-admin npm run codegen
