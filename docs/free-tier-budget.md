# Free-tier budget

Estimate date: 2026-07-11. Recheck Cloudflare limits immediately before each annual event.

Official references:

- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Static Assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)

## Free-plan limits used

| Resource                |                                      Included usage |
| ----------------------- | --------------------------------------------------: |
| Worker dynamic requests |                                         100,000/day |
| Static Assets requests  | free and unlimited; do not invoke Worker by default |
| Durable Object requests |                                         100,000/day |
| Durable Object duration |                                     13,000 GB-s/day |
| DO SQLite rows read     |                                       5,000,000/day |
| DO SQLite rows written  |                                         100,000/day |
| DO SQLite stored data   |                                          5 GB total |
| R2 Standard storage     |                                   10 GB-month/month |
| R2 Class A              |                                     1,000,000/month |
| R2 Class B              |                                    10,000,000/month |
| R2 egress               |                                                free |

Free-plan operations fail after a limit is exceeded; they do not transparently become paid overage. The operational target is therefore below 70–80%, not exactly 100%.

## Event assumptions

- 1,000 participant connections
- 4-hour event
- 4 reaction shards
- two reconnects per participant during the event (three total connection waves)
- 1,000 reach attempts
- up to 500 admin operations
- 20 prize images and every participant opens the prize list once
- 25-second application heartbeat on Bingo WebSocket
- reaction hard cap: 16,000 accepted/event total, divided by `REACTION_SHARDS`
- rejected reaction messages are assumed no more than accepted messages under normal operation

The hard cap is intentionally much lower than the 10-second client cooldown would theoretically permit. It protects SQLite rows-written and Durable Object request budgets.

## Worker requests

Static HTML, JavaScript, CSS, fonts, and reaction images are Static Assets and do not consume Worker request quota.

| Dynamic source                                   |   Estimate |
| ------------------------------------------------ | ---------: |
| `GET /api/session`                               |      1,000 |
| Bingo WebSocket upgrades, 3 waves                |      3,000 |
| Participant reaction WebSocket upgrades, 3 waves |      3,000 |
| Venue reaction upgrades, 4 shards × 3 waves      |         12 |
| Reach POST                                       |      1,000 |
| Admin API                                        |        500 |
| Prize image reads, 20 × 1,000                    |     20,000 |
| Manual state resync allowance                    |      1,000 |
| **Total**                                        | **29,512** |

Safety ratio: `100,000 / 29,512 = 3.39×`; estimated use is 29.5%.

Image reads dominate Worker requests. Browser immutable caching prevents repeated reads on the same device. If the prize count is much larger than 20, recalculate before the event.

## Durable Object requests and messages

Cloudflare counts a DO WebSocket connection as a request. Incoming WebSocket messages use a 20:1 billing ratio; outgoing messages are not billed as requests.

### BingoRoom

| Source                                                    |   Estimate |
| --------------------------------------------------------- | ---------: |
| WebSocket connections                                     |      3,000 |
| Heartbeats: `1,000 × 14,400 / 25 = 576,000` messages ÷ 20 |     28,800 |
| Reach RPC                                                 |      1,000 |
| Admin/state RPC allowance                                 |      1,000 |
| **BingoRoom subtotal**                                    | **33,800** |

### ReactionRoom

| Source                                          |   Estimate |
| ----------------------------------------------- | ---------: |
| Reaction WebSocket connections                  |      3,012 |
| 16,000 accepted + 16,000 rejected messages ÷ 20 |      1,600 |
| Admin enable/reset RPC, all shards              |       <100 |
| **Reaction subtotal**                           | **<4,712** |

Combined expected DO requests: approximately **38,512/day**, 38.5% of the 100,000/day limit. Safety ratio: about **2.60×**.

Abusive reconnects can increase Worker and DO upgrade requests. Cloudflare Access protects admin traffic, while public abuse must also be controlled with zone-level WAF/rate limiting if observed.

## Durable Object duration

Every DO is allocated/billed as 128 MiB (`0.125 GB`) while active and unable to hibernate.

Conservative worst case where BingoRoom and all four ReactionRoom shards remain active for all four hours:

```text
5 objects × 4 hours × 3,600 seconds × 0.125 GB = 9,000 GB-s
```

This is 69.2% of the 13,000 GB-s/day limit; safety ratio 1.44×. Actual duration should be lower because both classes use Hibernation WebSocket API and are duration-free while idle/eligible to hibernate. Heartbeats may keep BingoRoom active during busy periods, so duration is the tightest compute budget and must be monitored.

At 70% DO duration or request use, disable reactions. At 80%, also disable reach submissions and survey while preserving number operations.

## SQLite rows

### Writes

A reaction acceptance updates a client rate row, second bucket, and budget row; the text primary key may add index writes. Budget conservatively at four rows written per accepted reaction:

```text
16,000 × 4 = 64,000 reaction rows written
```

Bingo reach/admin/event-log allowance: 10,000 rows. Estimated total: **74,000 rows**, 74% of 100,000/day; safety ratio 1.35×.

### Reads

Even assuming ten rows read per reaction and 100 rows read per admin/snapshot operation, the result is below 500,000 rows, under 10% of 5,000,000/day.

### Stored data

The bounded 256-row event history, fewer than 100 numbers, a small prize list, 1,000 reach hashes, and 1,000 reaction hashes/shard are far below 5 GB. Historical reactions are never stored.

## R2

Worst-case 20 images at 2 MiB:

```text
20 × 2 MiB = 40 MiB ≈ 0.04 GB-month
```

| Operation             |      Estimate |       Free limit |
| --------------------- | ------------: | ---------------: |
| Class A upload/update |          <100 |  1,000,000/month |
| Class B image reads   |        20,000 | 10,000,000/month |
| Delete                |          free |             free |
| Storage               | 0.04 GB-month |      10 GB-month |

R2 has very large safety margins. Keep the bucket private and use Standard storage so the free tier applies.

## Reconnect and message estimate

- Expected Bingo reconnect upgrades: 2,000 beyond initial 1,000.
- Expected reaction reconnect upgrades: 2,000 beyond initial 1,000, plus venue shard connections.
- Number broadcast for 100 draws: 100,000 outgoing messages. Outgoing DO WebSocket messages do not count as DO requests.
- Heartbeats: 576,000 incoming messages, billed as about 28,800 DO requests at 20:1.
- Maximum accepted reactions: 16,000; each is one incoming client message and one outgoing venue message.

## Local 1,000-connection result

Command executed against local Wrangler/workerd on 2026-07-11:

```bash
ALLOW_LOAD_TEST=true \
LOAD_TEST_URL=http://localhost:5173 \
LOAD_TEST_CONNECTIONS=1000 \
LOAD_TEST_REACTION_RATIO=0.1 \
LOAD_TEST_ALLOW_WRITES=true \
LOAD_TEST_ADMIN_TOKEN=local-admin \
pnpm test:load
```

| Metric                                 |                            Result |
| -------------------------------------- | --------------------------------: |
| Initial connected / errors             |                         1,000 / 0 |
| Initial connect p50 / p95 / max        | 1,552.44 / 1,585.12 / 1,597.23 ms |
| Reconnected / errors                   |                         1,000 / 0 |
| Reconnect p50 / p95 / max              | 1,838.54 / 1,966.06 / 1,975.14 ms |
| Number delta delivered / errors        |                         1,000 / 0 |
| Broadcast p50 / p95 / max              |        91.81 / 127.76 / 131.55 ms |
| Reaction clients                       |                               100 |
| First reaction accepted                |                               100 |
| Immediate second reaction rate-limited |                               100 |
| Reaction errors                        |                                 0 |
| Estimated upgrades                     |                             2,100 |
| Estimated messages                     |                             3,400 |
| Load-process heap growth               |                  25,584,216 bytes |
| Elapsed                                |                       5,340.39 ms |

This proves local behavior and client-script capacity, not Cloudflare edge latency or production capacity. A remote preview load test requires explicit authorization and Cloudflare dashboard evidence for DO duration, error rate, memory, and disconnect metrics.
