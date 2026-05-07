import { jest, beforeEach, afterEach, test, expect } from '@jest/globals';
import { jAjax } from '../lib/index.js';
import { buildAjaxUrl, applyJsonResponse, classifySendError } from '../lib/js/Ajax.js';

// Mock XMLHttpRequest --------------------------------------------------
//
// jAjax.transport() opens an XHR and returns the (still-empty) `result`
// object before `onload` fires. To exercise the response-handling path we
// fire `onload` synchronously inside `send()`, so by the time the async
// transport's promise resolves, `result` has been populated.

class MockXHR {
    constructor() {
        this.headers = {};
        this.mimeType = null;
        this.status = 0;
        this.responseText = '';
        this.aborted = false;
        MockXHR.last = this;
    }
    open(method, url) { this.method = method; this.url = url; }
    setRequestHeader(name, value) { this.headers[name] = value; }
    overrideMimeType(type) { this.mimeType = type; }
    abort() { this.aborted = true; }
    send(body) {
        this.body = body;
        const next = MockXHR._next;
        MockXHR._next = null;
        if (!next) return;
        if (next.throw) throw next.throw;
        this.status = next.status ?? 200;
        this.responseText = next.responseText ?? '';
        if (next.fire === 'error') this.onerror && this.onerror();
        else this.onload && this.onload();
    }
}

beforeEach(() => {
    jest.useFakeTimers();
    global.XMLHttpRequest = MockXHR;
    MockXHR._next = null;
    MockXHR.last = null;
});

afterEach(() => {
    jest.useRealTimers();
    delete global.XMLHttpRequest;
});

// GET -------------------------------------------------------------------

test('GET: opens with method and url, defaults to JSON mime override', async () => {
    MockXHR._next = { status: 200, responseText: '{"ok":1}' };
    const api = new jAjax().setUrl('https://example.com/x').setMethod('GET');
    const result = await api.transport();
    expect(MockXHR.last.method).toBe('GET');
    expect(MockXHR.last.url).toBe('https://example.com/x');
    expect(MockXHR.last.mimeType).toBe('application/json');
    expect(result.status).toBe(200);
    expect(result.ok).toBe(1);
});

test('GET + json=false: skips overrideMimeType', async () => {
    MockXHR._next = { status: 200, responseText: 'plain' };
    const api = new jAjax().setUrl('u').setMethod('GET').withJson(false);
    await api.transport();
    expect(MockXHR.last.mimeType).toBe(null);
});

test('GET: appends data as query string and clears this.data', async () => {
    MockXHR._next = { status: 200, responseText: '{}' };
    const api = new jAjax().setUrl('https://example.com/x').setMethod('GET').setData('a=1&b=2');
    await api.transport();
    expect(MockXHR.last.url).toBe('https://example.com/x?a=1&b=2');
    expect(api.data).toBeUndefined();
});

// POST ------------------------------------------------------------------

test('POST: sets x-www-form-urlencoded Content-Type and sends body', async () => {
    MockXHR._next = { status: 200, responseText: '{}' };
    const api = new jAjax().setUrl('u').setMethod('POST').setData('a=1&b=2');
    await api.transport();
    expect(MockXHR.last.headers['Content-Type']).toBe('application/x-www-form-urlencoded; charset=UTF-8');
    expect(MockXHR.last.body).toBe('a=1&b=2');
});

test('POST: empty response body skips JSON parse and leaves result clean', async () => {
    MockXHR._next = { status: 200, responseText: '' };
    const api = new jAjax().setUrl('u').setMethod('POST');
    const result = await api.transport();
    expect(result.exception).toBeUndefined();
    expect(result.status).toBe(200);
    expect(result.responseText).toBe('');
});

// Response parsing -----------------------------------------------------

test('JSON response merges into result', async () => {
    MockXHR._next = { status: 200, responseText: '{"success":true,"data":{"id":7}}' };
    const api = new jAjax().setUrl('u').setMethod('GET');
    const result = await api.transport();
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ id: 7 });
});

test('invalid JSON sets exception="Invalid JSON"', async () => {
    MockXHR._next = { status: 200, responseText: 'not json' };
    const api = new jAjax().setUrl('u').setMethod('GET');
    const result = await api.transport();
    expect(result.exception).toBe('Invalid JSON');
});

// Failure paths --------------------------------------------------------

test('xhr.status === 0 sets exception="AJAX Request aborted"', async () => {
    MockXHR._next = { status: 0, responseText: '' };
    const api = new jAjax().setUrl('u').setMethod('GET');
    const result = await api.transport();
    expect(result.exception).toBe('AJAX Request aborted');
});

test('status >= 400 sets exception="AJAX request failed"', async () => {
    MockXHR._next = { status: 500, responseText: '' };
    const api = new jAjax().setUrl('u').setMethod('GET');
    const result = await api.transport();
    expect(result.status).toBe(500);
    expect(result.exception).toBe('AJAX request failed');
});

test('onerror fires "AJAX Request.onerror" exception', async () => {
    MockXHR._next = { fire: 'error' };
    const api = new jAjax().setUrl('u').setMethod('GET');
    const result = await api.transport();
    expect(result.exception).toBe('AJAX Request.onerror');
});

test('xhr.send() throwing sets exception="AJAX Request.send"', async () => {
    MockXHR._next = { throw: new Error('boom') };
    const api = new jAjax().setUrl('u').setMethod('GET');
    const result = await api.transport();
    expect(result.exception).toBe('AJAX Request.send');
});

test('xhr.send() throwing the network-suspended sentinel surfaces the user-facing message', async () => {
    MockXHR._next = { throw: 'net::ERR_NETWORK_IO_SUSPENDED' };
    const api = new jAjax().setUrl('u').setMethod('GET');
    const result = await api.transport();
    expect(result.exception).toBe('Connection lost .. reload the page');
});

// Pure helpers --------------------------------------------------------

test('buildAjaxUrl: GET + data appends as query string', () => {
    expect(buildAjaxUrl('GET', 'https://example.com/x', 'a=1')).toBe('https://example.com/x?a=1');
});

test('buildAjaxUrl: GET + falsy data returns the url unchanged', () => {
    expect(buildAjaxUrl('GET', 'https://example.com/x', null)).toBe('https://example.com/x');
    expect(buildAjaxUrl('GET', 'https://example.com/x', '')).toBe('https://example.com/x');
    expect(buildAjaxUrl('GET', 'https://example.com/x', undefined)).toBe('https://example.com/x');
});

test('buildAjaxUrl: non-GET methods ignore data', () => {
    expect(buildAjaxUrl('POST', 'https://example.com/x', 'a=1')).toBe('https://example.com/x');
    expect(buildAjaxUrl('PUT', 'https://example.com/x', 'a=1')).toBe('https://example.com/x');
    expect(buildAjaxUrl('DELETE', 'https://example.com/x', 'a=1')).toBe('https://example.com/x');
});

test('buildAjaxUrl: existing `?` in url collapses correctly', () => {
    expect(buildAjaxUrl('GET', 'https://example.com/x?b=2', 'a=1')).toBe('https://example.com/x?b=2&a=1');
});

test('applyJsonResponse: valid JSON merges into the same result reference', () => {
    const result = { url: 'u' };
    const ret = applyJsonResponse(result, '{"success":true,"data":{"id":7}}');
    expect(ret).toBe(result);
    expect(result).toEqual({ url: 'u', success: true, data: { id: 7 } });
});

test('applyJsonResponse: invalid JSON sets exception="Invalid JSON"', () => {
    const result = {};
    applyJsonResponse(result, 'not json');
    expect(result.exception).toBe('Invalid JSON');
});

test('classifySendError: sentinel string returns the user-facing message', () => {
    expect(classifySendError('net::ERR_NETWORK_IO_SUSPENDED')).toBe('Connection lost .. reload the page');
});

test('classifySendError: any other value returns "AJAX Request.send"', () => {
    expect(classifySendError(new Error('boom'))).toBe('AJAX Request.send');
    expect(classifySendError('something else')).toBe('AJAX Request.send');
    expect(classifySendError(null)).toBe('AJAX Request.send');
});

// Instance methods ---------------------------------------------------

function stubXhr() {
    return {
        opened: null,
        headers: {},
        mimeType: null,
        aborted: false,
        sent: false,
        sentBody: undefined,
        open(method, url) { this.opened = { method, url }; },
        setRequestHeader(name, value) { this.headers[name] = value; },
        overrideMimeType(type) { this.mimeType = type; },
        abort() { this.aborted = true; },
        send(body) { this.sent = true; this.sentBody = body; }
    };
}

test('configureXhr: json=true overrides mime, opens, no Content-Type for GET', () => {
    const xhr = stubXhr();
    new jAjax().setMethod('GET').configureXhr(xhr, 'u');
    expect(xhr.mimeType).toBe('application/json');
    expect(xhr.opened).toEqual({ method: 'GET', url: 'u' });
    expect(xhr.headers['Content-Type']).toBeUndefined();
});

test('configureXhr: json=false skips overrideMimeType', () => {
    const xhr = stubXhr();
    new jAjax().setMethod('GET').withJson(false).configureXhr(xhr, 'u');
    expect(xhr.mimeType).toBe(null);
});

test('configureXhr: POST sets the form-urlencoded Content-Type', () => {
    const xhr = stubXhr();
    new jAjax().setMethod('POST').configureXhr(xhr, 'u');
    expect(xhr.headers['Content-Type']).toBe('application/x-www-form-urlencoded; charset=UTF-8');
});

test('handleTimeout: aborts xhr, sets exception, resolves', () => {
    const xhr = stubXhr();
    const result = {};
    const resolve = jest.fn();
    new jAjax().handleTimeout(xhr, result, resolve);
    expect(xhr.aborted).toBe(true);
    expect(result.exception).toBe('AJAX Request timeout');
    expect(resolve).toHaveBeenCalledWith(result);
});

test('handleLoad: status===0 → "AJAX Request aborted", no status copied, clearTimeout fired', () => {
    const spy = jest.spyOn(globalThis, 'clearTimeout');
    const result = {};
    const resolve = jest.fn();
    new jAjax().handleLoad({ status: 0, responseText: '' }, result, resolve, 42);
    expect(spy).toHaveBeenCalledWith(42);
    expect(result.exception).toBe('AJAX Request aborted');
    expect(result.status).toBeUndefined();
    expect(resolve).toHaveBeenCalledWith(result);
    spy.mockRestore();
});

test('handleLoad: 200 + json=true + valid JSON merges fields', () => {
    const result = {};
    const resolve = jest.fn();
    new jAjax().setMethod('GET').handleLoad({ status: 200, responseText: '{"a":1}' }, result, resolve, 0);
    expect(result.a).toBe(1);
    expect(result.status).toBe(200);
    expect(result.exception).toBeUndefined();
});

test('handleLoad: 200 + json=true + invalid JSON sets exception="Invalid JSON"', () => {
    const result = {};
    const resolve = jest.fn();
    new jAjax().setMethod('GET').handleLoad({ status: 200, responseText: 'not json' }, result, resolve, 0);
    expect(result.exception).toBe('Invalid JSON');
});

test('handleLoad: 200 + POST + empty responseText skips parse, no exception', () => {
    const result = {};
    const resolve = jest.fn();
    new jAjax().setMethod('POST').handleLoad({ status: 200, responseText: '' }, result, resolve, 0);
    expect(result.exception).toBeUndefined();
    expect(result.responseText).toBe('');
});

test('handleLoad: status >= 400 sets exception="AJAX request failed"', () => {
    const result = {};
    const resolve = jest.fn();
    new jAjax().setMethod('GET').handleLoad({ status: 500, responseText: '' }, result, resolve, 0);
    expect(result.status).toBe(500);
    expect(result.exception).toBe('AJAX request failed');
});

test('handleError: clearTimeout + exception + resolve', () => {
    const spy = jest.spyOn(globalThis, 'clearTimeout');
    const result = {};
    const resolve = jest.fn();
    new jAjax().handleError(result, resolve, 99);
    expect(spy).toHaveBeenCalledWith(99);
    expect(result.exception).toBe('AJAX Request.onerror');
    expect(resolve).toHaveBeenCalledWith(result);
    spy.mockRestore();
});

test('dispatchSend: happy path forwards this.data || null and does not resolve', () => {
    const xhr = stubXhr();
    const resolve = jest.fn();
    new jAjax().setData('a=1').dispatchSend(xhr, {}, resolve, 0);
    expect(xhr.sent).toBe(true);
    expect(xhr.sentBody).toBe('a=1');
    expect(resolve).not.toHaveBeenCalled();
});

test('dispatchSend: send() throwing clears the timeout, classifies the error, resolves', () => {
    const spy = jest.spyOn(globalThis, 'clearTimeout');
    const xhr = stubXhr();
    xhr.send = () => { throw new Error('boom'); };
    const result = {};
    const resolve = jest.fn();
    new jAjax().dispatchSend(xhr, result, resolve, 7);
    expect(spy).toHaveBeenCalledWith(7);
    expect(result.exception).toBe('AJAX Request.send');
    expect(resolve).toHaveBeenCalledWith(result);
    spy.mockRestore();
});

test('dispatchSend: network-suspended sentinel surfaces user-facing message', () => {
    const xhr = stubXhr();
    xhr.send = () => { throw 'net::ERR_NETWORK_IO_SUSPENDED'; };
    const result = {};
    const resolve = jest.fn();
    new jAjax().dispatchSend(xhr, result, resolve, 0);
    expect(result.exception).toBe('Connection lost .. reload the page');
});
