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

# RustFS setup for production
setup-rustfs-prod:
	cd api && npm install && npm run setup-rustfs-prod

# Seed images to RustFS for production
seed-images-prod:
	cd api && npm run seed-images-prod

# Complete setup for production with RustFS initialization and seed data
setup-prod:
	make run-prod
	sleep 5
	make setup-rustfs-prod
	@echo "🔄 Restarting containers to apply new credentials..."
	docker compose -f docker-compose.prod.yml restart
	sleep 15
	make seed-images-prod

# RustFS setup for development
setup-rustfs:
	cd api && npm install && npm run setup-rustfs

# Seed images to RustFS for development
seed-images:
	cd api && npm run seed-images

# Complete setup with RustFS initialization and seed data
setup:
	make run
	sleep 5
	make setup-rustfs
	@echo "🔄 Restarting containers to apply new credentials..."
	docker compose restart
	sleep 10
	make seed-images

# Legacy MinIO commands (deprecated, kept for reference)
generate-minio-keys:
	@echo "⚠️  This command is deprecated. Use 'make setup-rustfs' instead."
	cd api/seeds && ./generate_minio_credentials.sh

seed:
	@echo "⚠️  This command is deprecated. Use 'make seed-images' instead."
	cd api/seeds && ./seed_with_existing_images.sh

codegen/user:
	docker compose run --rm view-user npm run codegen

codegen/admin:
	docker compose run --rm view-admin npm run codegen

codegen:
	docker compose run --rm view-user npm run codegen
	docker compose run --rm view-admin npm run codegen
