#!/bin/bash

# 負荷試験結果分析ツール
# ========================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="$SCRIPT_DIR/results"

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 最新の結果ファイルを分析
analyze_latest_results() {
    echo -e "${CYAN}📊 最新の負荷試験結果を分析中...${NC}"
    echo ""
    
    # K6結果の分析
    local latest_k6_http=$(ls -t "$RESULTS_DIR"/k6_http_*.json 2>/dev/null | head -1)
    local latest_k6_ws=$(ls -t "$RESULTS_DIR"/k6_websocket_*.json 2>/dev/null | head -1)
    local latest_artillery=$(ls -t "$RESULTS_DIR"/artillery_*.json 2>/dev/null | head -1)
    
    if [[ -f "$latest_k6_http" ]]; then
        echo -e "${BLUE}🌐 K6 HTTP API試験結果:${NC}"
        analyze_k6_results "$latest_k6_http"
        echo ""
    fi
    
    if [[ -f "$latest_k6_ws" ]]; then
        echo -e "${BLUE}🔌 K6 WebSocket試験結果:${NC}"
        analyze_k6_results "$latest_k6_ws"
        echo ""
    fi
    
    if [[ -f "$latest_artillery" ]]; then
        echo -e "${BLUE}🎯 Artillery統合試験結果:${NC}"
        analyze_artillery_results "$latest_artillery"
        echo ""
    fi
}

# K6結果の詳細分析
analyze_k6_results() {
    local result_file="$1"
    
    if [[ ! -f "$result_file" ]]; then
        echo -e "${RED}❌ 結果ファイルが見つかりません: $result_file${NC}"
        return 1
    fi
    
    echo "  📁 ファイル: $(basename "$result_file")"
    
    # JSONから主要メトリクスを抽出（簡易版）
    if command -v jq >/dev/null 2>&1; then
        echo "  📈 主要メトリクス:"
        
        # HTTP リクエスト数
        local http_reqs=$(jq -r '.metrics.http_reqs.values.count // 0' "$result_file")
        echo "    - 総HTTPリクエスト数: $http_reqs"
        
        # エラー率
        local error_rate=$(jq -r '.metrics.http_req_failed.values.rate // 0' "$result_file")
        local error_percentage=$(echo "scale=2; $error_rate * 100" | bc 2>/dev/null || echo "N/A")
        echo "    - エラー率: ${error_percentage}%"
        
        # レスポンス時間
        local avg_duration=$(jq -r '.metrics.http_req_duration.values.avg // 0' "$result_file")
        local p95_duration=$(jq -r '.metrics.http_req_duration.values["p(95)"] // 0' "$result_file")
        echo "    - 平均レスポンス時間: ${avg_duration}ms"
        echo "    - 95%ileレスポンス時間: ${p95_duration}ms"
        
        # 仮想ユーザー数
        local max_vus=$(jq -r '.metrics.vus_max.values.max // 0' "$result_file")
        echo "    - 最大同時ユーザー数: $max_vus"
        
    else
        echo "  ℹ️  詳細分析にはjqが必要です"
        echo "      インストール: sudo apt-get install jq (Ubuntu/Debian)"
        echo "      インストール: brew install jq (macOS)"
    fi
}

# Artillery結果の詳細分析
analyze_artillery_results() {
    local result_file="$1"
    
    if [[ ! -f "$result_file" ]]; then
        echo -e "${RED}❌ 結果ファイルが見つかりません: $result_file${NC}"
        return 1
    fi
    
    echo "  📁 ファイル: $(basename "$result_file")"
    
    if command -v jq >/dev/null 2>&1; then
        echo "  📈 主要メトリクス:"
        
        # シナリオ数
        local scenarios=$(jq -r '.aggregate.counters."core.scenarios.completed" // 0' "$result_file")
        echo "    - 完了シナリオ数: $scenarios"
        
        # レスポンス時間
        local response_time=$(jq -r '.aggregate.summaries."http.response_time".mean // 0' "$result_file")
        echo "    - 平均レスポンス時間: ${response_time}ms"
        
        # エラー数
        local errors=$(jq -r '.aggregate.counters."core.errors" // 0' "$result_file")
        echo "    - エラー数: $errors"
        
    else
        echo "  ℹ️  詳細分析にはjqが必要です"
    fi
}

# パフォーマンス判定
evaluate_performance() {
    echo -e "${CYAN}⚖️ パフォーマンス判定${NC}"
    echo ""
    
    # 目標値の定義
    local target_avg_response=500      # 平均レスポンス時間 500ms以下
    local target_p95_response=1000     # 95%ileレスポンス時間 1000ms以下
    local target_error_rate=1          # エラー率 1%以下
    
    local overall_score=0
    local max_score=3
    
    # 最新のK6 HTTP結果を確認
    local latest_k6_http=$(ls -t "$RESULTS_DIR"/k6_http_*.json 2>/dev/null | head -1)
    
    if [[ -f "$latest_k6_http" ]] && command -v jq >/dev/null 2>&1; then
        local avg_duration=$(jq -r '.metrics.http_req_duration.values.avg // 0' "$latest_k6_http")
        local p95_duration=$(jq -r '.metrics.http_req_duration.values["p(95)"] // 0' "$latest_k6_http")
        local error_rate=$(jq -r '.metrics.http_req_failed.values.rate // 0' "$latest_k6_http")
        
        # 平均レスポンス時間の判定
        if (( $(echo "$avg_duration <= $target_avg_response" | bc -l) )); then
            echo -e "  ✅ 平均レスポンス時間: ${GREEN}PASS${NC} (${avg_duration}ms <= ${target_avg_response}ms)"
            ((overall_score++))
        else
            echo -e "  ❌ 平均レスポンス時間: ${RED}FAIL${NC} (${avg_duration}ms > ${target_avg_response}ms)"
        fi
        
        # 95%ileレスポンス時間の判定
        if (( $(echo "$p95_duration <= $target_p95_response" | bc -l) )); then
            echo -e "  ✅ 95%ileレスポンス時間: ${GREEN}PASS${NC} (${p95_duration}ms <= ${target_p95_response}ms)"
            ((overall_score++))
        else
            echo -e "  ❌ 95%ileレスポンス時間: ${RED}FAIL${NC} (${p95_duration}ms > ${target_p95_response}ms)"
        fi
        
        # エラー率の判定
        local error_percentage=$(echo "scale=2; $error_rate * 100" | bc)
        if (( $(echo "$error_rate <= 0.01" | bc -l) )); then
            echo -e "  ✅ エラー率: ${GREEN}PASS${NC} (${error_percentage}% <= ${target_error_rate}%)"
            ((overall_score++))
        else
            echo -e "  ❌ エラー率: ${RED}FAIL${NC} (${error_percentage}% > ${target_error_rate}%)"
        fi
        
        echo ""
        echo -e "  📊 総合スコア: ${overall_score}/${max_score}"
        
        if [[ $overall_score -eq $max_score ]]; then
            echo -e "  🎉 判定: ${GREEN}EXCELLENT${NC} - 全ての目標値をクリア"
        elif [[ $overall_score -ge 2 ]]; then
            echo -e "  👍 判定: ${YELLOW}GOOD${NC} - 大部分の目標値をクリア"
        else
            echo -e "  ⚠️  判定: ${RED}NEEDS IMPROVEMENT${NC} - パフォーマンス改善が必要"
        fi
        
    else
        echo -e "${YELLOW}ℹ️  結果ファイルが見つからないか、jqがインストールされていません${NC}"
    fi
    
    echo ""
}

# 結果ファイル一覧表示
list_results() {
    echo -e "${CYAN}📂 負荷試験結果ファイル一覧${NC}"
    echo ""
    
    if [[ ! -d "$RESULTS_DIR" ]]; then
        echo -e "${YELLOW}結果ディレクトリが存在しません: $RESULTS_DIR${NC}"
        return 1
    fi
    
    local count=0
    
    echo -e "${BLUE}K6 HTTP API試験結果:${NC}"
    for file in "$RESULTS_DIR"/k6_http_*.json; do
        if [[ -f "$file" ]]; then
            echo "  📄 $(basename "$file") ($(stat -c%y "$file" | cut -d' ' -f1-2))"
            ((count++))
        fi
    done
    
    echo ""
    echo -e "${BLUE}K6 WebSocket試験結果:${NC}"
    for file in "$RESULTS_DIR"/k6_websocket_*.json; do
        if [[ -f "$file" ]]; then
            echo "  📄 $(basename "$file") ($(stat -c%y "$file" | cut -d' ' -f1-2))"
            ((count++))
        fi
    done
    
    echo ""
    echo -e "${BLUE}Artillery統合試験結果:${NC}"
    for file in "$RESULTS_DIR"/artillery_*.json; do
        if [[ -f "$file" ]]; then
            echo "  📄 $(basename "$file") ($(stat -c%y "$file" | cut -d' ' -f1-2))"
            ((count++))
        fi
    done
    
    echo ""
    echo -e "${BLUE}HTMLレポート:${NC}"
    for file in "$RESULTS_DIR"/*.html; do
        if [[ -f "$file" ]]; then
            echo "  🌐 $(basename "$file") ($(stat -c%y "$file" | cut -d' ' -f1-2))"
            ((count++))
        fi
    done
    
    echo ""
    echo -e "📊 総ファイル数: $count"
}

# 古い結果ファイルのクリーンアップ
cleanup_old_results() {
    echo -e "${YELLOW}🧹 古い結果ファイルをクリーンアップしますか？${NC}"
    echo "30日以上経過したファイルを削除します。"
    echo ""
    
    read -p "続行しますか？ (y/N): " confirm
    
    if [[ $confirm =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}クリーンアップ中...${NC}"
        
        local deleted_count=0
        
        # 30日以上古いファイルを削除
        find "$RESULTS_DIR" -name "*.json" -type f -mtime +30 -exec rm {} \; -exec echo "削除: {}" \; | while read line; do
            ((deleted_count++))
            echo "$line"
        done
        
        find "$RESULTS_DIR" -name "*.html" -type f -mtime +30 -exec rm {} \; -exec echo "削除: {}" \; | while read line; do
            echo "$line"
        done
        
        echo -e "${GREEN}✅ クリーンアップ完了${NC}"
    else
        echo "キャンセルしました。"
    fi
}

# メインメニュー
main_menu() {
    while true; do
        echo -e "${CYAN}📊 負荷試験結果分析ツール${NC}"
        echo "=========================="
        echo ""
        echo "  1) 最新結果の分析"
        echo "  2) パフォーマンス判定"
        echo "  3) 結果ファイル一覧"
        echo "  4) 古いファイルのクリーンアップ"
        echo "  5) 終了"
        echo ""
        
        read -p "選択 (1-5): " choice
        
        case $choice in
            1)
                analyze_latest_results
                echo ""
                ;;
            2)
                evaluate_performance
                ;;
            3)
                list_results
                echo ""
                ;;
            4)
                cleanup_old_results
                echo ""
                ;;
            5)
                echo -e "${GREEN}👋 お疲れさまでした！${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}❌ 無効な選択です。1-5の範囲で選択してください。${NC}"
                echo ""
                ;;
        esac
    done
}

# 引数チェック
if [[ $# -gt 0 ]]; then
    case $1 in
        "analyze") analyze_latest_results ;;
        "evaluate") evaluate_performance ;;
        "list") list_results ;;
        "cleanup") cleanup_old_results ;;
        *) 
            echo "使用方法: $0 [analyze|evaluate|list|cleanup]"
            exit 1
            ;;
    esac
else
    main_menu
fi
