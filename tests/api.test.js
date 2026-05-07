import { jest, test, expect } from '@jest/globals';
import { jFetch } from '../lib/index.js';

// jApi is the (unexported) base class. We exercise it through jFetch.

test('defaults after construction', () => {
    const api = new jFetch();
    expect(api.method).toBe('GET');
    expect(api.json).toBe(true);
    expect(api.timeout).toBe(5000);
    expect(api.reloadTimeout).toBe(2000);
    expect(api.debug).toBe(false);
    expect(api.url).toBe('');
    expect(api.data).toBe(null);
    expect(api.callback).toBe(null);
    expect(api.response).toBe(null);
    expect(api.messengerConfig).toEqual({});
});

test('setters return `this` (chainable)', () => {
    const api = new jFetch();
    expect(api.withDebug(true)).toBe(api);
    expect(api.withJson(false)).toBe(api);
    expect(api.setUrl('https://example.com')).toBe(api);
    expect(api.setMethod('post')).toBe(api);
    expect(api.setTimeout(1000)).toBe(api);
    expect(api.setReloadTimeout(500)).toBe(api);
    expect(api.setData({ a: 1 })).toBe(api);
    expect(api.setCallback(() => { })).toBe(api);
    expect(api.setMessengerConfig({ x: 1 })).toBe(api);
    expect(api.sets({})).toBe(api);
});

test('withDebug / withJson default to true when called without args', () => {
    const api = new jFetch();
    api.withDebug();
    api.withJson();
    expect(api.debug).toBe(true);
    expect(api.json).toBe(true);
});

test('setMethod uppercases', () => {
    const api = new jFetch();
    api.setMethod('post');
    expect(api.method).toBe('POST');
    api.setMethod('Patch');
    expect(api.method).toBe('PATCH');
});

test('setMethod() with no arg defaults to GET', () => {
    const api = new jFetch();
    api.setMethod('post').setMethod();
    expect(api.method).toBe('GET');
});

test('sets() applies url/method/timeout/reloadTimeout/json/data/callback/messengerConfig', () => {
    const cb = () => { };
    const api = new jFetch().sets({
        url: 'https://example.com/api',
        method: 'put',
        timeout: 1234,
        reloadTimeout: 99,
        json: false,
        data: { a: 1 },
        callback: cb,
        messengerConfig: { dismissible: false }
    });
    expect(api.url).toBe('https://example.com/api');
    expect(api.method).toBe('PUT');
    expect(api.timeout).toBe(1234);
    expect(api.reloadTimeout).toBe(99);
    expect(api.json).toBe(false);
    expect(api.data).toEqual({ a: 1 });
    expect(api.callback).toBe(cb);
    expect(api.messengerConfig).toEqual({ dismissible: false });
});

test('sets() ignores keys with the wrong type', () => {
    const api = new jFetch().sets({
        url: 42,           // not a string -> ignored
        method: 99,        // not a string -> ignored
        timeout: '1000',   // not a number -> ignored
        json: 'yes',       // not a boolean -> ignored
        callback: 'fn'     // not a function -> ignored
    });
    expect(api.url).toBe('');
    expect(api.method).toBe('GET');
    expect(api.timeout).toBe(5000);
    expect(api.json).toBe(true);
    expect(api.callback).toBe(null);
});

test('sets() with no arg is a no-op', () => {
    const api = new jFetch();
    api.sets();
    expect(api.url).toBe('');
    expect(api.method).toBe('GET');
});

test('sets() with data: null still calls setData (typeof null !== "undefined")', () => {
    const api = new jFetch().setData({ a: 1 }).sets({ data: null });
    expect(api.data).toBe(null);
});

test('init() merges defaults and applies url', () => {
    const api = new jFetch().init('https://example.com/x', { method: 'POST' });
    expect(api.url).toBe('https://example.com/x');
    expect(api.method).toBe('POST');
    expect(api.timeout).toBe(5000);
});

test('get() configures method=GET, json=true', () => {
    const api = new jFetch().withJson(false).get('https://example.com/g');
    expect(api.url).toBe('https://example.com/g');
    expect(api.method).toBe('GET');
    expect(api.json).toBe(true);
});

test('post() / put() / patch() / delete() set method + json=true', () => {
    expect(new jFetch().post('u').method).toBe('POST');
    expect(new jFetch().put('u').method).toBe('PUT');
    expect(new jFetch().patch('u').method).toBe('PATCH');
    expect(new jFetch().delete('u').method).toBe('DELETE');
    expect(new jFetch().post('u').json).toBe(true);
});

test('post() accepts an extra config object', () => {
    const api = new jFetch().post('https://example.com/p', { timeout: 9999 });
    expect(api.url).toBe('https://example.com/p');
    expect(api.method).toBe('POST');
    expect(api.timeout).toBe(9999);
});

test('call() throws "Invalid Api call URL" when url is empty', () => {
    const api = new jFetch();
    expect(() => api.call()).toThrow('Invalid Api call URL');
});

test('call() throws "Invalid Api call URL" when url is whitespace only', () => {
    const api = new jFetch().setUrl('   ');
    expect(() => api.call()).toThrow('Invalid Api call URL');
});

test('call() throws "Invalid Api call URL" when url is non-string', () => {
    const api = new jFetch();
    api.url = 42;
    expect(() => api.call()).toThrow('Invalid Api call URL');
});

test('logMessage() is a no-op when debug is false', () => {
    const api = new jFetch();
    const spy = jest.spyOn(console, 'debug').mockImplementation(() => { });
    api.logMessage('hello');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
});

test('logMessage() forwards to console[method] when debug is true', () => {
    const api = new jFetch().withDebug(true);
    const spy = jest.spyOn(console, 'debug').mockImplementation(() => { });
    api.logMessage('hello');
    expect(spy).toHaveBeenCalledWith('hello');
    spy.mockRestore();
});

test('call() does not throw when url is valid (regression: no settings.data ReferenceError)', () => {
    global.fetch = jest.fn().mockReturnValue(
        Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') })
    );
    try {
        const api = new jFetch().setUrl('https://example.com/x').setData({ a: 1 }).post('https://example.com/x');
        expect(() => api.call()).not.toThrow();
    } finally {
        delete global.fetch;
    }
});

test('call() with POST + json=true preserves object data for the transport to stringify', () => {
    global.fetch = jest.fn().mockReturnValue(
        Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') })
    );
    try {
        const api = new jFetch().post('https://example.com/x').setData({ a: 1 });
        api.call();
        expect(api.data).toEqual({ a: 1 });
    } finally {
        delete global.fetch;
    }
});

test('call() with GET + object data url-encodes via param() and appends to URL', () => {
    global.fetch = jest.fn().mockReturnValue(
        Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve('') })
    );
    try {
        const api = new jFetch().get('https://example.com/x').withJson(false).setData({ a: 1, b: 'two' });
        api.call();
        const [url] = global.fetch.mock.calls[0];
        expect(url).toBe('https://example.com/x?a=1&b=two');
    } finally {
        delete global.fetch;
    }
});

test('displayMessage() delegates to messenger.add when a messenger is set', () => {
    const add = jest.fn();
    const api = new jFetch().setMessenger({ add });
    api.displayMessage('hello', 'info', { x: 1 });
    expect(add).toHaveBeenCalledWith('hello', 'info', { x: 1 });
});
