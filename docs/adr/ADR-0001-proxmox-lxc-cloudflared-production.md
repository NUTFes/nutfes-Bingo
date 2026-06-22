# ADR-0001: 本番公開経路をProxmox LXC + Cloudflaredに固定する

## Status

Accepted

## Context

このアプリケーションは技大祭当日に年1回だけ稼働する。開発者が離脱した後でも、引き継ぎ担当者が手順書通りに本番へ到達できることを優先する必要がある。

従来の本番構成は、Linux VPSで80/443を直接公開する経路と、Cloudflare Tunnelで公開する経路を `DEPLOY_MODE` で切り替える形だった。この切り替えは柔軟だが、年1運用ではDNS、firewall、Caddyの待受、Cloudflare Tunnelの設定、疎通確認の分岐が手順に漏れやすい。

運用対象はProxmox上のLXCとし、外部公開はCloudflaredからCloudflare Tunnelへ出す方針に固定する。LXCとはProxmox上で動くLinuxコンテナで、ここではDocker EngineとDocker Composeを実行する本番ホストを指す。CloudflaredとはCloudflare Tunnelへ接続する常駐プロセスで、ホスト側に80/443を公開せず、Cloudflare側のPublic Hostnameから内部のCaddyへHTTPで転送する。

## Decision

本番公開経路はProxmox LXC + Cloudflaredに固定する。

`compose.vps.yml` と `DEPLOY_MODE=vps` の運用分岐は廃止する。Docker Composeは常に `compose.prod.yml` と `compose.cloudflare.yml` を重ねて起動する。CaddyはLXC内のCompose network上で `:8080` を待ち受け、CloudflaredだけがCaddyへ接続する。LXCホストは原則としてSSHの管理口だけを開け、アプリ公開のためにTCP 80/443やUDP 443を開けない。

運用担当者向けのinterfaceは、`mise run prod:preflight`、`mise run prod:deploy`、`mise run prod:smoke` を中心にする。preflightはLXC、必須コマンド、`.env.production`、Cloudflared token、永続ディレクトリ、Compose設定を検査する。deployはpreflight、Compose起動、smoke testを順に実行する。

## Consequences

公開経路が一つになるため、引き継ぎ手順の分岐が減る。CaddyやPostgreSQL、Kongをホストの公開portへ出さないため、公開面も小さくなる。Cloudflare Tunnelが必須になるため、Cloudflare Zero Trust側のTunnelとPublic Hostnameの設定は本番前チェックリストに含める必要がある。

VPSで直接80/443を公開する構成は、このリポジトリではサポートしない。将来、VPS直公開へ戻す必要が生じた場合は、このADRを編集せず、新しいADRでこの判断をsupersedeする。

## Supersedes / Amends

ADR-0002でamendされた。Proxmox LXC + Cloudflared固定は維持し、Caddy経由の単一origin構成は廃止する。
