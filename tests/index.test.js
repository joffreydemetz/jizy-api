import * as pkg from '../lib/index.js';

test('public entry exports jAjax and jFetch', () => {
    expect(pkg.jAjax).toBeTruthy();
    expect(pkg.jFetch).toBeTruthy();
});

test('jAjax / jFetch are constructors', () => {
    expect(typeof pkg.jAjax).toBe('function');
    expect(typeof pkg.jFetch).toBe('function');
});

test('jFetch instance has the chainable jApi setters', () => {
    const api = new pkg.jFetch();
    expect(typeof api.setUrl).toBe('function');
    expect(typeof api.setMethod).toBe('function');
    expect(typeof api.withJson).toBe('function');
    expect(typeof api.withDebug).toBe('function');
    expect(typeof api.sets).toBe('function');
    expect(typeof api.call).toBe('function');
    expect(typeof api.transport).toBe('function');
});

test('jAjax instance has the chainable jApi setters', () => {
    const api = new pkg.jAjax();
    expect(typeof api.setUrl).toBe('function');
    expect(typeof api.setMethod).toBe('function');
    expect(typeof api.transport).toBe('function');
});
