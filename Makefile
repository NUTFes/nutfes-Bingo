run:
	docker compose up -d --build
	sleep 20
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
	sleep 15
	make db-apply-prod

# MinIO credentials management for production
generate-minio-keys-prod:
	cd api/seeds && ./generate_minio_credentials.sh prod

# Seed data commands for production
seed-prod:
	cd api/seeds && ./seed_with_existing_images.sh prod

# Complete setup for production with new MinIO credentials and seed data
setup-prod:
	make run-prod
	make generate-minio-keys-prod
	@echo "🔄 Restarting containers to apply new credentials..."
	docker compose -f docker-compose.prod.yml restart
	sleep 15
	make seed-prod

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
