# Makefile for Bingo Project (Supabase + Next.js)

SUPABASE_DIR := supabase-project
COMPOSE := docker compose
DEV_COMPOSE := $(COMPOSE)
PROD_COMPOSE := $(COMPOSE) -f docker-compose.prod.yml
SUPA_COMPOSE := $(COMPOSE) -f $(SUPABASE_DIR)/docker-compose.yml
WEB_SERVICE := web
NETWORK := bingo-network
BUILD ?= 0

.PHONY: help setup net up dev dev-build run install update restart rebuild down ps shell supa-up supa-down supa-restart supa-reset logs logs-supa db-status db-query db-shell up-prod run-prod down-prod logs-prod

help: ## このヘルプを表示
	@echo ""
	@echo "🎯 Bingo Project コマンド一覧"
	@echo "=============================="
	@echo ""
	@echo "📦 基本コマンド (Dev):"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
	@echo ""

# ============================================================
# 基本コマンド (Dev Environment)
# ============================================================

setup: ## 初回セットアップ（ネットワーク作成、Supabase起動、Devアプリ起動）
	@$(MAKE) net
	@$(MAKE) up

net: ## Dockerネットワークを作成/確認
	@docker network inspect $(NETWORK) >/dev/null 2>&1 || docker network create $(NETWORK)

up: ## Dev環境をすべて起動（Supabase → Devアプリ）
	@$(MAKE) supa-up
	@echo "⏳ Supabaseの起動を待機中..."
	@sleep 5
	@$(SUPABASE_DIR)/scripts/db-setup.sh
	@$(MAKE) run

dev: ## Dev環境をすべて起動（= up）
	@$(MAKE) up

run: net ## Devアプリのみ起動（BUILD=1で再ビルド）
	$(DEV_COMPOSE) up -d $(if $(filter 1 true yes,$(BUILD)),--build,)

dev-build: ## Devアプリをビルドして起動
	@$(MAKE) run BUILD=1

install: ## 依存関係を同期（package.json更新時）
	@if [ -n "$$($(DEV_COMPOSE) ps -q $(WEB_SERVICE))" ]; then \
		$(DEV_COMPOSE) exec $(WEB_SERVICE) pnpm install; \
	else \
		$(DEV_COMPOSE) run --rm $(WEB_SERVICE) pnpm install; \
	fi

update: ## 依存更新 → 再起動
	@$(MAKE) install
	@$(MAKE) restart

restart: ## Devアプリを再起動
	$(DEV_COMPOSE) restart $(WEB_SERVICE)

rebuild: ## Dev環境を再構築（node_modulesボリュームも再作成）
	$(DEV_COMPOSE) down -v
	@$(MAKE) run BUILD=1

down: ## すべて停止（Dev, Prod, Supabase）
	$(DEV_COMPOSE) down
	$(PROD_COMPOSE) down
	@$(MAKE) supa-down

ps: ## コンテナ状態を表示
	$(DEV_COMPOSE) ps

shell: ## Devコンテナに入る
	$(DEV_COMPOSE) exec $(WEB_SERVICE) sh

# ============================================================
# 本番環境コマンド (Prod Environment)
# ============================================================

up-prod: ## Prod環境をすべて起動（Supabase → Prodアプリ）
	@$(MAKE) supa-up
	@echo "⏳ Supabaseの起動を待機中..."
	@sleep 5
	@$(SUPABASE_DIR)/scripts/db-setup.sh
	@$(MAKE) run-prod

run-prod: ## Prodアプリのみ起動
	$(PROD_COMPOSE) up -d

down-prod: ## Prodアプリのみ停止
	$(PROD_COMPOSE) down

logs-prod: ## Prodアプリのログを表示
	$(PROD_COMPOSE) logs -f

# ============================================================
# Supabase コマンド
# ============================================================

supa-up: ## Supabaseを起動
	@echo "🚀 Supabaseを起動中..."
	$(SUPA_COMPOSE) up -d
	@echo ""
	@echo "✅ Supabase起動完了！"
	@echo "   - Studio:  http://localhost:3000"
	@echo "   - API:     http://localhost:8000"

supa-down: ## Supabaseを停止
	$(SUPA_COMPOSE) down

supa-restart: ## Supabaseを再起動
	@$(MAKE) supa-down
	@$(MAKE) supa-up
	@sleep 5
	@$(SUPABASE_DIR)/scripts/db-setup.sh

supa-reset: ## Supabaseを完全リセット（⚠️ データ全削除）
	@$(SUPABASE_DIR)/scripts/db-reset.sh

# ============================================================
# データベース操作コマンド
# ============================================================

db-status: ## DBの状態を確認
	@$(SUPABASE_DIR)/scripts/db-status.sh

db-query: ## SQLクエリを実行（例: make db-query SQL="SELECT * FROM numbers LIMIT 5"）
	@if [ -z "$(SQL)" ]; then \
		echo "Usage: make db-query SQL=\"YOUR SQL QUERY\""; \
		echo "例: make db-query SQL=\"SELECT * FROM public.numbers LIMIT 5\""; \
	else \
		docker exec supabase-db psql -U postgres -d postgres -c "$(SQL)"; \
	fi

db-shell: ## PostgreSQLシェルを起動（インタラクティブモード）
	@echo "📝 PostgreSQLシェルを起動中..."
	@echo "   終了するには \\q を入力"
	@echo ""
	docker exec -it supabase-db psql -U postgres -d postgres

db-tables: ## テーブル一覧を表示
	@docker exec supabase-db psql -U postgres -d postgres -c "\dt public.*"

db-schema: ## スキーマ詳細を表示（例: make db-schema TABLE=numbers）
	@if [ -z "$(TABLE)" ]; then \
		echo "Usage: make db-schema TABLE=<table_name>"; \
		echo "例: make db-schema TABLE=numbers"; \
	else \
		docker exec supabase-db psql -U postgres -d postgres -c "\d public.$(TABLE)"; \
	fi

# ============================================================
# ログ確認コマンド
# ============================================================

logs: ## Devアプリのログを表示
	$(DEV_COMPOSE) logs -f

logs-supa: ## Supabase全体のログを表示
	$(SUPA_COMPOSE) logs -f

logs-db: ## DBのログを表示
	$(SUPA_COMPOSE) logs -f db

logs-api: ## API（Kong）のログを表示
	$(SUPA_COMPOSE) logs -f kong

logs-storage: ## Storageのログを表示
	$(SUPA_COMPOSE) logs -f storage

# ============================================================
# キャッシュ・クリーンアップ
# ============================================================

clean-cache: ## Next.jsビルドキャッシュをクリア
	rm -rf .next
	@echo "✅ キャッシュをクリアしました。'pnpm dev'で再ビルドしてください。"

clean-cache-sudo: ## Next.jsビルドキャッシュをクリア（sudo権限）
	sudo rm -rf .next
	sudo chown -R $(shell whoami) .next
	@echo "✅ キャッシュをクリアし、権限を修正しました。"
