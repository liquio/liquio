# Message bus

Provider-agnostic message bus for `@liquio/back-core`. A component publishes JSON messages to named destinations and subscribes handlers to them. The core owns the JSON envelope, message ids, delay tiers, in-flight accounting and drain, logging and the async context. A provider owns the transport.

Contract: delivery is at-least-once, each message goes to one subscriber among replicas, there is no ordering guarantee, and a publish resolves after the provider durably accepted the message.

## Quick start

```ts
import { createMessageBus, withBpmnLogContext } from '@liquio/back-core';

const bus = createMessageBus({
  provider: 'rabbitmq',
  providerOptions: { /* provider-specific */ },
  destinations: withBpmnLogContext({
    manager: { address: 'bpmn-manager' },
    task: { address: 'bpmn-task', delays: { 'errors-10m': 600000, 'errors-1h': 3600000 } },
  }),
  getLog: () => log,
});

await bus.subscribe('manager', async (payload, { messageId }) => {
  // true: processed. false: deliver again later.
  return true;
}, { concurrency: 4, onFailure: async ({ error }) => ({ errorId: await storeFailure(error) }) });

await bus.init();
await bus.publish('task', { workflowId: 'w1' }, { delayMs: 600000 });
await bus.close({ drainTimeoutMs: 20000 });
```

## Configuration

| Key | Meaning |
|---|---|
| `provider` | Provider name. Default `rabbitmq`. |
| `providerOptions` | Provider-specific options, including duplicate suppression. Passed through unread by the core. |
| `destinations` | Logical name -> `{ address, delays?, logContext? }`. Names match `^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$`. Delay tiers are label -> milliseconds. |
| `getLog` | Returns an object with `save(event, data?, level?)`. |
| `connectInBackground` | `init()` resolves at once and the connection is made in the background. Default `false`. |
| `reconnectDelayMs` | Delay between reconnect attempts. Default `10000`. |
| `maxPayloadBytes` | Upper bound for a serialized message. The smaller of this and the provider limit applies. |
| `publishRetry` | `{ attempts, delayMs }`. Default no retry. |
| `logContext` | Default log-context extractor. A destination's own `logContext` wins. |
| `runInContext` | Wraps every delivery. Default `runInAsyncLocalStorage`. |

## Semantics

- Handler results (strict). `true`: processed. `false`: deliver again later. A throw, a rejection or any non-boolean result (including a bare `return;`) is a handler failure: the message is discarded and never redelivered, so a failing message is handled exactly once.
- Failure hook. `onFailure` is called once per handler failure, before the message is discarded, with `{ destination, messageId, payload, failure, error }`. Store the full error details in the component's own store and return `{ errorId }`. The bus logs only identifiers, plus `errorId` for correlation. A throwing hook is logged as `message-bus-failure-hook-error` and does not change the outcome.
- Logging. The only payload-derived data logged is the sanitized result of the log-context extractor (scalar values, at most 20 keys, strings up to 128 characters). Bodies, body fragments, error messages, stacks and `JSON.parse` messages are never logged; errors are logged as `{ name, code? }` only.
- Message id. Every published body gets the field `amqpMessageId` (name kept for compatibility with messages in flight and stored workflow history). The caller's payload is never mutated. `options.messageId` overrides the generated id.
- Size. A serialized message over the limit is rejected with `MessageTooLargeError`; nothing is sent.
- Delays. With tiers, a `delayMs` is rounded up to the first tier that is at least as long, or the largest tier. Without tiers, a provider with arbitrary delay support takes the raw value; otherwise the publish is rejected with `MessageBusConfigError`. `getRetryDelayMs('10m' | '1h' | '2h' | '8h' | '1d')` maps a postponed-time label to `MESSAGE_BUS_RETRY_DELAYS`; anything else gives one day.
- Reconnect. After every (re)connect the bus declares the destinations again and re-attaches all subscriptions. Outcomes for deliveries from a dropped connection are ignored by the provider.
- Close. `close({ drainTimeoutMs })` cancels consumers, waits for in-flight handlers up to the timeout, then closes the provider. Later publishes reject with `MessageBusUnavailableError`.
- Health. `health()` returns status, reconnects, in-flight count, subscriptions, counters (`handled`, `redelivered`, `discarded`, `handlerErrors`, `parseErrors`, `publishErrors`) and `lastHandlerErrorAt`.
- Duplicate suppression is a provider option, see the provider sections.

## Providers

### Providers in production

Only `rabbitmq` is for production. `memory` is for development and tests and refuses to start when `NODE_ENV=production`.

### rabbitmq

Persistent JSON messages, a confirm channel for publishing (a publish resolves on the broker ack), one channel per consumer with `prefetch` set to the subscription concurrency. A close of the connection or of any channel reconnects after `reconnectDelayMs`; settles for deliveries of a dropped connection are skipped and the broker redelivers them.

`providerOptions` is a component's whole `message_queue.json`; keys that are not listed here are ignored.

| Option | Description |
|---|---|
| `amqpConnection` | Connection URL. Required (`MessageBusConfigError` otherwise). Contains credentials and is never logged. |
| `amqpConnectionParams` | Query parameters appended to the URL, e.g. `{ "heartbeat": 300 }`. With amqplib 2.x `heartbeat=0` disables heartbeats. |
| `queueParams` | `[{ queueName, params }]`: `params` is merged over the declare options of the queue with exactly that physical name. |
| `maxMessageBytes` | Provider payload limit. Default `134217728`. |
| `dedup` | Duplicate suppression, see below. |

Delay tiers: for a destination with address `A` and tier `T`, the queue `A-T` is declared with `x-message-ttl` = the tier delay, `x-dead-letter-exchange` = `''` and `x-dead-letter-routing-key` = `A`. A delayed publish goes to `A-T`. Arbitrary delays are not supported.

Legacy compatibility: queue names and declare arguments match the old per-component clients, so in-flight messages and existing queues keep working. A different declare argument would make RabbitMQ answer `PRECONDITION_FAILED` and close the channel, which results in a reconnect every `reconnectDelayMs`.

#### Duplicate suppression (`dedup`)

Active only with `isEnabled: true`. Uses a key-value store with `get(key)` and `set(key, value, ttlSeconds)`: pass `getStore` (e.g. a back-core `RedisClient` the component already has) or `redis: { host, port }` and the provider opens and closes its own `RedisClient`.

| Option | Description |
|---|---|
| `isEnabled` | Default `false`. |
| `ttl` | TTL of the processed marker, seconds. Default `7200`. |
| `inProgress.isEnabled` | Default `false`. Marks a message as being processed. |
| `inProgress.ttl` | Seconds. Default `600`. |
| `inProgress.waitMs` | How long a delivery waits when the marker exists, before it is redelivered. Default `300000`. |
| `getStore` | Returns the store per message; a falsy result skips dedup for that message. Takes precedence over `redis`. |
| `redis` | `{ host, port }` of a store the provider opens itself. |

Keys: `amqp-message-id.<id>` (processed) and `amqp-message-id.<id>.wip` (in progress, not deleted after handling, it expires). A message without an id is not deduplicated. A processed message is acked without calling the handler; the processed key is written before the ack, so a lost ack is still deduplicated on redelivery.

Fail-open: a store error is logged as a warning and processing continues as if the key were missing, so handlers must stay idempotent while the store is down.

Log events: `message-bus-duplicate`, `message-bus-in-progress-wait`, `message-bus-dedup-error` (destination, messageId, operation, key and the error name only). Mapped from `message-from-queue-handled-from-redis`, `message-from-queue-not-handled-waited-wip` and `message-from-queue-id-*-redis-error`.

### memory

In-process queues for unit tests. `providerOptions.broker` (a `MemoryBroker`) lets two buses share queues. Test helpers on `MemoryMessageBusProvider`: `messages(address)`, `discarded(address)`, `injectRaw(address, body)`, `simulateDisconnect()`, `simulateReconnect()`, `failNextSend(error)`.

## Log events

`message-bus-connected`, `message-bus-connection-error`, `message-bus-disconnected`, `message-bus-published`, `message-bus-publish-error`, `message-bus-received`, `message-bus-handled`, `message-bus-not-handled`, `message-bus-handler-error`, `message-bus-failure-hook-error`, `message-bus-parse-error`, `message-bus-log-context-error`, `message-bus-closing`, `message-bus-closed`. Shutdown helper: `app-stopping`, `app-stop-step-error`, `app-stop-timeout`, `app-stopped`.

| Old event | New event |
|---|---|
| `amqp-connected` | `message-bus-connected` |
| `amqp-connection-error*` | `message-bus-connection-error` |
| `amqp-connection-closed`, `amqp-channel-closed` | `message-bus-disconnected` |
| `amqp-starting-reconnect`, `amqp-successfully-reconnected` | `message-bus-reconnecting`, `message-bus-connected` |
| `amqp-message-sent` | `message-bus-published` |
| `amqp-send-message-error`, `amqp-produce-error` | `message-bus-publish-error` |
| `message-from-queue-to-handle` | `message-bus-received` |
| `message-from-queue-handled`, `-ack` | `message-bus-handled` |
| `message-from-queue-not-handled` | `message-bus-not-handled` |
| `message-from-queue-handler-error` | `message-bus-handler-error` |
| `message-parse-error` | `message-bus-parse-error` |
| `connection-closed-by-app` | `message-bus-closed` |

The duplicate-suppression log events are listed in the rabbitmq provider section.

## Legacy `message_queue.json` keys

Each component maps its legacy keys in its own `src/lib/message_bus.ts`; no config migration is needed.

- `maxHandlingMessages`, `maxHandlingGeneratingPdfMessages` -> subscription `concurrency`.
- `retryConnectionTime` -> `reconnectDelayMs`.
- `redis.amqpMessageCache.*` (task: `redis.redisCommonBpmn.amqpMessageCache.*`) -> the rabbitmq provider's `dedup` option.
- `delayedAutoCommitQueues` -> delay tiers.

Logical destinations (name -> address):

| Component | Destinations |
|---|---|
| manager | `manager`=`readingQueueName`, `task`=`writingQueueTask`, `event`=`writingQueueEvent`, `gateway`=`writingQueueGateway`, `event.<key>`=`${writingQueueEvent}-${key}` for each key of `specificWritingQueuesEvent` |
| gateway | `gateway`=`readingQueueName`, `manager`=`writingQueueName` |
| event | `event`=`readingQueueName` (retry tiers), `manager`=`writingQueueName` |
| task | `task`=`readingQueueName` (retry tiers), `manager`=`writingQueueName`, `task-pdf`=`bpmn-task-incoming-generating-pdf`, `task-delayed-auto-commit`=`${readingQueueName}-delayed-auto-commit` (tiers from `delayedAutoCommitQueues`, declared only when that map is non-empty) |
| admin-api | `manager`, `task`, `event`, `gateway` from `writingQueueManager`, `writingQueueTask`, `writingQueueEvent`, `writingQueueGateway` |

## BPMN log fields

`withBpmnLogContext(destinations)` and `bpmnMessageLogContext(destination)` (module `bpmn-messages`) set the identifier fields that are safe to log per BPMN destination. See `BPMN_MESSAGE_LOG_FIELDS`.
