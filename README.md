# jizy-api

A lightweight API transport library — `fetch` and `XMLHttpRequest` proxies sharing a chainable API.

## Install

```
npm i jizy-api
```

ESM only: the package ships its `lib/` sources (no `dist/` bundle, no browser global). Import it from
your own bundle.

## Modules

- **Api.js** — `jApi` base class. Holds the request configuration (URL, method, json, timeout, data, callback, messenger) and the response-handling pipeline (`call`, `onResponse`). Subclasses implement `transport()`. Named helper: `param(input)` (bracket-notation query-string serializer).
- **Fetch.js** — `jFetch` extends `jApi` with a `fetch`-based transport. Named helpers: `appendQuery`, `buildFetchHeaders`, `buildFetchBody`, `classifyFetchError`.
- **Ajax.js** — `jAjax` extends `jApi` with an `XMLHttpRequest`-based transport. Named helpers: `buildAjaxUrl`, `applyJsonResponse`, `classifySendError`.
- **ApiResponse.js** — response shape produced by `onResponse` (`success`, `data`, `error`, `message`, `info`).

## Public exports

```js
import { jFetch, jAjax } from 'jizy-api';
```

## Usage

```js
import { jFetch } from 'jizy-api';

new jFetch()
    .post('https://api.example.com/users')
    .setData({ name: 'alice' })
    .setCallback((response) => {
        if (response.success) console.log('created', response.data);
    })
    .call();
```

`call()` returns the instance, not a promise: the result reaches you through the callback.

### HTTP shortcuts

`get`, `post`, `put`, `patch`, `delete` configure method + `json: true` and return the instance — chain `.call()` to dispatch.

```js
new jFetch().get('/users').call();
new jFetch().post('/users', { timeout: 10000 }).setData({ name: 'alice' }).call();
new jFetch().delete('/users/1').call();
```

A shortcut first resets the configuration to its defaults (URL, method, timeout, reload timeout, json,
messenger config, data), so call it before the other setters.

### Configuration

| Setter | Default | Notes |
|---|---|---|
| `setUrl(url)` | `''` | Required before `call()` — empty/whitespace throws `Invalid Api call URL`. |
| `setMethod(m)` | `'GET'` | Uppercased automatically. |
| `withJson(b)` | `true` | Toggles JSON request/response handling. |
| `withDebug(b)` | `false` | Logs the request lifecycle via `console.debug`. |
| `setTimeout(ms)` | `5000` | Aborts the request when exceeded. |
| `setReloadTimeout(ms)` | `2000` | Delay before page reload when `response.reload` is true. |
| `setData(d)` | `null` | Object → JSON body for POST/PUT/PATCH with `json: true`; otherwise url-encoded form. |
| `setCallback(fn)` | `null` | Invoked with the parsed `ApiResponse`. Return `false` to suppress reload. |
| `setMessenger(m)` | none | Optional [`jizy-messenger`](https://www.npmjs.com/package/jizy-messenger) instance — duck-typed on `messenger.add(message, type, config)`. |
| `setMessengerConfig(cfg)` | `{}` | Forwarded to the messenger. |

`sets({...})` sets several of them in one call; it reads the keys `url`, `method`, `timeout`,
`reloadTimeout`, `json`, `messengerConfig`, `data` and `callback` (the messenger and debug flag have
their own setters only).

The response's `error`, `message` and `info` strings are passed to the messenger (`info` with
`dismissible: false, persistant: false, timeout: 3`). Without a messenger they fall back to `alert()`.

## Tests

```
npm test
```

Jest, run in ESM mode (`node --experimental-vm-modules`).

## License

MIT — see [LICENSE](LICENSE).
