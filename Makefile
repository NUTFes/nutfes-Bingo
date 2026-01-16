# Makefile for Bingo Project (Supabase + Next.js)

SUPABASE_DIR := supabase-project

.PHONY: help setup up down run supa-up supa-down supa-restart supa-reset logs logs-supa db-status db-query db-shell up-prod run-prod down-prod logs-prod

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
	@echo "🔧 Dockerネットワークを作成中..."
	docker network inspect bingo-network >/dev/null 2>&1 || docker network create bingo-network
	@make up

up: ## Dev環境をすべて起動（Supabase → Devアプリ）
	@make supa-up
	@echo "⏳ Supabaseの起動を待機中..."
	@sleep 5
	@$(SUPABASE_DIR)/scripts/db-setup.sh
	@make run

run: ## Devアプリのみ起動
	docker compose up -d

down: ## すべて停止（Dev, Prod, Supabase）
	docker compose down
	docker compose -f docker-compose.prod.yml down
	@make supa-down

# ============================================================
# 本番環境コマンド (Prod Environment)
# ============================================================

up-prod: ## Prod環境をすべて起動（Supabase → Prodアプリ）
	@make supa-up
	@echo "⏳ Supabaseの起動を待機中..."
	@sleep 5
	@$(SUPABASE_DIR)/scripts/db-setup.sh
	@make run-prod

run-prod: ## Prodアプリのみ起動
	docker compose -f docker-compose.prod.yml up -d

down-prod: ## Prodアプリのみ停止
	docker compose -f docker-compose.prod.yml down

logs-prod: ## Prodアプリのログを表示
	docker compose -f docker-compose.prod.yml logs -f

# ============================================================
# Supabase コマンド
# ============================================================

supa-up: ## Supabaseを起動
	@echo "🚀 Supabaseを起動中..."
	docker compose -f $(SUPABASE_DIR)/docker-compose.yml up -d
	@echo ""
	@echo "✅ Supabase起動完了！"
	@echo "   - Studio:  http://localhost:3000"
	@echo "   - API:     http://localhost:8000"

supa-down: ## Supabaseを停止
	docker compose -f $(SUPABASE_DIR)/docker-compose.yml down

supa-restart: ## Supabaseを再起動
	@make supa-down
	@make supa-up
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
	docker compose logs -f

logs-supa: ## Supabase全体のログを表示
	docker compose -f $(SUPABASE_DIR)/docker-compose.yml logs -f

logs-db: ## DBのログを表示
	docker compose -f $(SUPABASE_DIR)/docker-compose.yml logs -f db

logs-api: ## API（Kong）のログを表示
	docker compose -f $(SUPABASE_DIR)/docker-compose.yml logs -f kong

logs-storage: ## Storageのログを表示
	docker compose -f $(SUPABASE_DIR)/docker-compose.yml logs -f storage

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
