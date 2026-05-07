import { jest, beforeEach, afterEach, test, expect } from '@jest/globals';
import { jFetch } from '../lib/index.js';
import { appendQuery, buildFetchHeaders, buildFetchBody, classifyFetchError } from '../lib/js/Fetch.js';

// Helpers ---------------------------------------------------------------

function mockOk(body = '', status = 200) {
    const text = typeof body === 'string' ? body : JSON.stringify(body);
    return Promise.resolve({ ok: true, status, text: () => Promise.resolve(text) });
}

function mockFail(status = 500, body = '') {
    return Promise.resolve({ ok: false, status, text: () => Promise.resolve(body) });
}

function lastFetchCall() {
    return global.fetch.mock.calls[global.fetch.mock.calls.length - 1];
}

beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn();
});

afterEach(() => {
    jest.useRealTimers();
    delete global.fetch;
});

// GET -------------------------------------------------------------------

test('GET: passes url through and sets Accept=application/json when json=true', async () => {
    global.fetch.mockReturnValue(mockOk({ ok: 1 }));
    const api = new jFetch().setUrl('https://example.com/x').setMethod('GET');
    const result = await api.transport();
    const [url, options] = lastFetchCall();
    expect(url).toBe('https://example.com/x');
    expect(options.method).toBe('GET');
    expect(options.body).toBe(null);
    expect(options.headers.Accept).toBe('application/json');
    expect(result.status).toBe(200);
    expect(result.ok).toBe(1);
});

test('GET: appends data as query string and clears this.data', async () => {
    global.fetch.mockReturnValue(mockOk(''));
    const api = new jFetch().setUrl('https://example.com/x').setMethod('GET').setData('a=1&b=2');
    await api.transport();
    const [url] = lastFetchCall();
    expect(url).toBe('https://example.com/x?a=1&b=2');
    expect(api.data).toBe(null);
});

test('GET: existing query string is preserved when appending data', async () => {
    global.fetch.mockReturnValue(mockOk(''));
    const api = new jFetch().setUrl('https://example.com/x?b=2').setMethod('GET').setData('a=1');
    await api.transport();
    expect(lastFetchCall()[0]).toBe('https://example.com/x?b=2&a=1');
});

test('GET: json=false omits the Accept JSON header', async () => {
    global.fetch.mockReturnValue(mockOk(''));
    const api = new jFetch().setUrl('https://example.com/x').setMethod('GET').withJson(false);
    await api.transport();
    expect(lastFetchCall()[1].headers.Accept).toBeUndefined();
});

// POST ------------------------------------------------------------------

test('POST + json=true: stringifies object body and sets JSON Content-Type', async () => {
    global.fetch.mockReturnValue(mockOk(''));
    const api = new jFetch().setUrl('u').setMethod('POST').setData({ a: 1 });
    await api.transport();
    const [, options] = lastFetchCall();
    expect(options.method).toBe('POST');
    expect(options.headers['Content-Type']).toBe('application/json; charset=UTF-8');
    expect(options.headers.Accept).toBe('application/json');
    expect(options.body).toBe(JSON.stringify({ a: 1 }));
});

test('POST + json=true + string body: passes the string through', async () => {
    global.fetch.mockReturnValue(mockOk(''));
    const api = new jFetch().setUrl('u').setMethod('POST').setData('{"x":1}');
    await api.transport();
    expect(lastFetchCall()[1].body).toBe('{"x":1}');
});

test('POST + json=false: uses urlencoded Content-Type and text/plain Accept', async () => {
    global.fetch.mockReturnValue(mockOk(''));
    const api = new jFetch().setUrl('u').setMethod('POST').withJson(false).setData('a=1&b=2');
    await api.transport();
    const [, options] = lastFetchCall();
    expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded; charset=UTF-8');
    expect(options.headers.Accept).toBe('text/plain');
    expect(options.body).toBe('a=1&b=2');
});

test('POST: empty response body returns the bare result without parsing', async () => {
    global.fetch.mockReturnValue(mockOk(''));
    const api = new jFetch().setUrl('u').setMethod('POST').setData({ a: 1 });
    const result = await api.transport();
    expect(result.exception).toBeUndefined();
    expect(result.responseText).toBe('');
    expect(result.status).toBe(200);
});

test('POST: parses JSON body and merges fields into the result', async () => {
    global.fetch.mockReturnValue(mockOk({ success: true, data: { id: 7 } }));
    const api = new jFetch().setUrl('u').setMethod('POST').setData({});
    const result = await api.transport();
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 7 });
});

test('POST + json=true: invalid JSON response sets exception="Invalid JSON response"', async () => {
    global.fetch.mockReturnValue(mockOk('not json'));
    const api = new jFetch().setUrl('u').setMethod('POST').setData({});
    const result = await api.transport();
    expect(result.exception).toBe('Invalid JSON response');
});

// PUT / PATCH / DELETE --------------------------------------------------

test('PUT + json=true: stringifies object body, sets JSON Content-Type', async () => {
    global.fetch.mockReturnValue(mockOk(''));
    const api = new jFetch().setUrl('u').setMethod('PUT').setData({ a: 1 });
    await api.transport();
    const [, options] = lastFetchCall();
    expect(options.method).toBe('PUT');
    expect(options.headers['Content-Type']).toBe('application/json; charset=UTF-8');
    expect(options.body).toBe(JSON.stringify({ a: 1 }));
});

test('PATCH + json=false: urlencoded Content-Type, raw body', async () => {
    global.fetch.mockReturnValue(mockOk(''));
    const api = new jFetch().setUrl('u').setMethod('PATCH').withJson(false).setData('a=1');
    await api.transport();
    const [, options] = lastFetchCall();
    expect(options.method).toBe('PATCH');
    expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded; charset=UTF-8');
    expect(options.body).toBe('a=1');
});

test('DELETE: body is sent through when data is set', async () => {
    global.fetch.mockReturnValue(mockOk(''));
    const api = new jFetch().setUrl('u').setMethod('DELETE').setData('id=7');
    await api.transport();
    const [, options] = lastFetchCall();
    expect(options.method).toBe('DELETE');
    expect(options.body).toBe('id=7');
    expect(options.headers.Accept).toBe('text/plain');
});

// Failure paths ---------------------------------------------------------

test('non-ok response sets exception="AJAX Response failed"', async () => {
    global.fetch.mockReturnValue(mockFail(500, ''));
    const api = new jFetch().setUrl('u').setMethod('GET');
    const result = await api.transport();
    expect(result.status).toBe(500);
    expect(result.exception).toBe('AJAX Response failed');
});

test('rejected fetch sets exception="AJAX Request failed"', async () => {
    global.fetch.mockReturnValue(Promise.reject(new TypeError('boom')));
    const api = new jFetch().setUrl('u').setMethod('GET');
    const result = await api.transport();
    expect(result.exception).toBe('AJAX Request failed');
});

test('AbortError sets exception="AJAX Request timeout"', async () => {
    const abort = new Error('aborted');
    abort.name = 'AbortError';
    global.fetch.mockReturnValue(Promise.reject(abort));
    const api = new jFetch().setUrl('u').setMethod('GET');
    const result = await api.transport();
    expect(result.exception).toBe('AJAX Request timeout');
});

test('passes a controller signal so timeouts can abort the request', async () => {
    global.fetch.mockReturnValue(mockOk(''));
    const api = new jFetch().setUrl('u').setMethod('GET');
    await api.transport();
    const [, options] = lastFetchCall();
    expect(options.signal).toBeDefined();
    expect(typeof options.signal.aborted).toBe('boolean');
});

// Pure helpers --------------------------------------------------------

test('appendQuery: empty/falsy query returns url unchanged', () => {
    expect(appendQuery('https://example.com/x', '')).toBe('https://example.com/x');
    expect(appendQuery('https://example.com/x', null)).toBe('https://example.com/x');
    expect(appendQuery('https://example.com/x', undefined)).toBe('https://example.com/x');
});

test('appendQuery: appends with `?` for first param', () => {
    expect(appendQuery('https://example.com/x', 'a=1')).toBe('https://example.com/x?a=1');
});

test('appendQuery: existing `?` in url collapses correctly', () => {
    expect(appendQuery('https://example.com/x?b=2', 'a=1')).toBe('https://example.com/x?b=2&a=1');
});

test('buildFetchHeaders: GET + json=true → Accept: application/json only', () => {
    expect(buildFetchHeaders('GET', true)).toEqual({ Accept: 'application/json' });
});

test('buildFetchHeaders: GET + json=false → empty headers', () => {
    expect(buildFetchHeaders('GET', false)).toEqual({});
});

test('buildFetchHeaders: POST + json=true → JSON Accept + JSON Content-Type', () => {
    expect(buildFetchHeaders('POST', true)).toEqual({
        Accept: 'application/json',
        'Content-Type': 'application/json; charset=UTF-8'
    });
});

test('buildFetchHeaders: POST + json=false → urlencoded Content-Type, text/plain Accept', () => {
    expect(buildFetchHeaders('POST', false)).toEqual({
        Accept: 'text/plain',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    });
});

test('buildFetchHeaders: PUT + json=true keeps Accept=text/plain (preserved quirk)', () => {
    // Existing behavior: the json branch sets Accept=application/json, the
    // non-POST/non-GET branch then overrides it to text/plain, and Content-Type
    // is set to application/json afterwards. Locked in to flag any drift.
    expect(buildFetchHeaders('PUT', true)).toEqual({
        Accept: 'text/plain',
        'Content-Type': 'application/json; charset=UTF-8'
    });
});

test('buildFetchHeaders: PATCH + json=false → urlencoded + text/plain', () => {
    expect(buildFetchHeaders('PATCH', false)).toEqual({
        Accept: 'text/plain',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
    });
});

test('buildFetchHeaders: DELETE → text/plain Accept, no Content-Type', () => {
    expect(buildFetchHeaders('DELETE', true)).toEqual({ Accept: 'text/plain' });
    expect(buildFetchHeaders('DELETE', false)).toEqual({ Accept: 'text/plain' });
});

test('buildFetchBody: falsy data → body: null', () => {
    expect(buildFetchBody('POST', true, null)).toEqual({ body: null });
    expect(buildFetchBody('POST', true, '')).toEqual({ body: null });
    expect(buildFetchBody('GET', true, null)).toEqual({ body: null });
});

test('buildFetchBody: POST + json=true + object → JSON.stringify', () => {
    expect(buildFetchBody('POST', true, { a: 1 })).toEqual({ body: '{"a":1}' });
});

test('buildFetchBody: POST + json=true + string → passthrough', () => {
    expect(buildFetchBody('POST', true, '{"x":1}')).toEqual({ body: '{"x":1}' });
});

test('buildFetchBody: POST + json=false → raw data', () => {
    expect(buildFetchBody('POST', false, 'a=1&b=2')).toEqual({ body: 'a=1&b=2' });
});

test('buildFetchBody: PUT + json=true + object → JSON.stringify', () => {
    expect(buildFetchBody('PUT', true, { a: 1 })).toEqual({ body: '{"a":1}' });
});

test('buildFetchBody: PATCH + json=false → raw data', () => {
    expect(buildFetchBody('PATCH', false, 'a=1')).toEqual({ body: 'a=1' });
});

test('buildFetchBody: DELETE → raw data passthrough', () => {
    expect(buildFetchBody('DELETE', true, 'id=7')).toEqual({ body: 'id=7' });
});

test('buildFetchBody: GET → body: null (data lives in URL, not body)', () => {
    expect(buildFetchBody('GET', true, 'a=1')).toEqual({ body: null });
});

test('buildFetchBody: POST + json=true + circular object → error="Invalid JSON input data"', () => {
    const circular = {};
    circular.self = circular;
    expect(buildFetchBody('POST', true, circular)).toEqual({
        body: null,
        error: 'Invalid JSON input data'
    });
});

test('buildFetchBody: PUT + json=true + circular object → error="Invalid JSON data"', () => {
    const circular = {};
    circular.self = circular;
    expect(buildFetchBody('PUT', true, circular)).toEqual({
        body: null,
        error: 'Invalid JSON data'
    });
});

test('classifyFetchError: AbortError → "AJAX Request timeout"', () => {
    const e = new Error('aborted');
    e.name = 'AbortError';
    expect(classifyFetchError(e)).toBe('AJAX Request timeout');
});

test('classifyFetchError: anything else → "AJAX Request failed"', () => {
    expect(classifyFetchError(new TypeError('boom'))).toBe('AJAX Request failed');
    expect(classifyFetchError(null)).toBe('AJAX Request failed');
    expect(classifyFetchError(undefined)).toBe('AJAX Request failed');
});

// Instance methods ---------------------------------------------------

function fakeResponse({ ok = true, status = 200, body = '' } = {}) {
    return { ok, status, text: () => Promise.resolve(typeof body === 'string' ? body : JSON.stringify(body)) };
}

test('parseResponse: 200 + json=true + valid JSON merges fields, no exception', async () => {
    const result = {};
    const api = new jFetch().setMethod('GET');
    await api.parseResponse(result, 'u', fakeResponse({ body: { ok: 1 } }));
    expect(result.url).toBe('u');
    expect(result.status).toBe(200);
    expect(result.ok).toBe(1);
    expect(result.exception).toBeUndefined();
});

test('parseResponse: 200 + json=true + invalid JSON sets exception="Invalid JSON response"', async () => {
    const result = {};
    const api = new jFetch().setMethod('GET');
    await api.parseResponse(result, 'u', fakeResponse({ body: 'not json' }));
    expect(result.exception).toBe('Invalid JSON response');
});

test('parseResponse: 200 + POST + empty body skips parse, no exception', async () => {
    const result = {};
    const api = new jFetch().setMethod('POST');
    await api.parseResponse(result, 'u', fakeResponse({ body: '' }));
    expect(result.responseText).toBe('');
    expect(result.exception).toBeUndefined();
});

test('parseResponse: 200 + json=false records text without parsing', async () => {
    const result = {};
    const api = new jFetch().setMethod('GET').withJson(false);
    await api.parseResponse(result, 'u', fakeResponse({ body: 'plain' }));
    expect(result.responseText).toBe('plain');
    expect(result.exception).toBeUndefined();
});

test('parseResponse: !ok response sets exception="AJAX Response failed"', async () => {
    const result = {};
    const api = new jFetch().setMethod('GET');
    await api.parseResponse(result, 'u', fakeResponse({ ok: false, status: 500 }));
    expect(result.status).toBe(500);
    expect(result.exception).toBe('AJAX Response failed');
});

test('handleFetchError: AbortError → exception="AJAX Request timeout"', () => {
    const result = {};
    const e = new Error('aborted');
    e.name = 'AbortError';
    new jFetch().handleFetchError(result, e);
    expect(result.exception).toBe('AJAX Request timeout');
});

test('handleFetchError: other error → exception="AJAX Request failed"', () => {
    const result = {};
    new jFetch().handleFetchError(result, new TypeError('boom'));
    expect(result.exception).toBe('AJAX Request failed');
});

test('transport: bodyError short-circuits before calling fetch', async () => {
    const circular = {};
    circular.self = circular;
    const api = new jFetch().setUrl('u').setMethod('POST').setData(circular);
    const result = await api.transport();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.url).toBe('u');
    expect(result.exception).toBe('Invalid JSON input data');
});
