# WebSocket protocol

All messages are UTF-8 JSON. Client messages larger than 4 KiB are rejected with close code `1009`. Three invalid or rejected messages close the connection with `1008`.

## Endpoints

| Endpoint                                | Object                        | Client role                         |
| --------------------------------------- | ----------------------------- | ----------------------------------- |
| `/api/ws`                               | `BingoRoom`                   | participant, venue, admin read-only |
| `/api/reactions/ws?role=client`         | selected `ReactionRoom` shard | participant sender                  |
| `/api/reactions/ws?role=screen&shard=N` | explicit `ReactionRoom` shard | venue receiver                      |

The venue opens one reaction connection for every shard from `/api/session.reactionShards`.

## Bingo connection

### First connection

Connect without `lastVersion`:

```text
GET /api/ws
Connection: Upgrade
Upgrade: websocket
```

BingoRoom immediately returns a complete snapshot.

```json
{
  "type": "snapshot",
  "version": 100,
  "eventId": "2026",
  "numbers": [{ "id": 1, "number": 15 }],
  "latestNumber": 15,
  "reachCount": 10,
  "survey": { "active": false, "url": "" },
  "prizes": [],
  "flags": {
    "reactionsEnabled": true,
    "reachSubmissionEnabled": true,
    "surveyEnabled": true,
    "adminWritesEnabled": true,
    "readOnlyMode": false
  }
}
```

### Resume

The client stores the last applied version in memory and reconnects with:

```text
GET /api/ws?lastVersion=100
```

- If all events `101..current` remain in the 256-event history, BingoRoom sends them in ascending order.
- If history is missing, non-contiguous, or the client version is ahead, BingoRoom sends a snapshot.
- If the client is already current, no state message is required; the client keeps its last snapshot.
- A client may explicitly send `{"type":"resync","lastVersion":100}` after connection.

The SPA reconnect delay is exponential, capped at 30 seconds, with 0.75–1.25 jitter. No automatic HTTP polling exists.

## Bingo delta messages

Every delta contains the version committed in the same SQLite transaction as the state mutation.

### Number added

```json
{ "type": "number.added", "version": 101, "payload": { "id": 2, "number": 42 } }
```

### Number updated

```json
{ "type": "number.updated", "version": 102, "payload": { "id": 2, "number": 43 } }
```

### Number deleted

```json
{ "type": "number.deleted", "version": 103, "payload": { "id": 2, "number": 43 } }
```

### All numbers reset

```json
{ "type": "numbers.reset", "version": 104, "payload": {} }
```

### Reach changed or reset

```json
{ "type": "reach.updated", "version": 105, "payload": { "count": 11 } }
```

```json
{ "type": "reach.reset", "version": 106, "payload": { "count": 0 } }
```

### Survey

```json
{
  "type": "survey.updated",
  "version": 107,
  "payload": { "active": true, "url": "https://example.com/survey" }
}
```

### Prizes

Prize mutations send the complete, deterministically ordered prize list because the list is small and create/update/delete/reorder can change multiple display positions.

```json
{
  "type": "prizes.updated",
  "version": 108,
  "payload": [
    {
      "id": 1,
      "nameJa": "景品",
      "nameEn": "Prize",
      "imageKey": "prizes/uuid.webp",
      "imageUrl": "/api/prize-images/prizes%2Fuuid.webp",
      "isWon": false,
      "sortOrder": 0
    }
  ]
}
```

### Feature flags

```json
{
  "type": "flags.updated",
  "version": 109,
  "payload": {
    "reactionsEnabled": false,
    "reachSubmissionEnabled": true,
    "surveyEnabled": true,
    "adminWritesEnabled": true,
    "readOnlyMode": false
  }
}
```

### Event initialized

```json
{ "type": "event.initialized", "version": 110, "payload": {} }
```

The client then requests a fresh snapshot once. This is an event-driven resync, not polling.

## Heartbeat

The runtime handles protocol ping/pong frames without waking a hibernated object. The browser also sends an application heartbeat every 25 seconds while connected:

```json
{ "type": "ping" }
```

Response:

```json
{ "type": "pong", "version": 110 }
```

Application heartbeat traffic is included in the free-tier estimate.

## Reaction protocol

### Send

```json
{ "type": "reaction", "name": "heart" }
```

Allowed names:

```text
angry cracker crap good heart peace sad skull smile surprise
```

Success acknowledgement:

```json
{ "type": "reaction.accepted", "at": 1783754000000 }
```

Venue message (the envelope supports future 100–250 ms batching):

```json
{
  "type": "reaction.batch",
  "reactions": [{ "name": "heart", "at": 1783754000000 }]
}
```

Reaction state is transient. Historical reactions are not persisted.

## Errors and close codes

Application error:

```json
{ "type": "error", "code": "invalid_message", "message": "Invalid WebSocket message" }
```

Reaction rejection:

```json
{ "type": "error", "code": "reaction_rejected", "message": "Reaction rate limit exceeded" }
```

| Code   | Meaning                                      |
| ------ | -------------------------------------------- |
| `1000` | normal client shutdown                       |
| `1003` | client rejected invalid server JSON          |
| `1008` | policy violation / repeated invalid messages |
| `1009` | message exceeds 4 KiB                        |
| `1011` | server broadcast failure                     |

## Hibernation recovery

Both object classes use `DurableObjectState.acceptWebSocket()`. Connection metadata is serialized with `serializeAttachment()` and restored with `deserializeAttachment()` after hibernation. Active sockets are enumerated with `getWebSockets()`; authoritative state and rate limits come from SQLite, not process memory.
