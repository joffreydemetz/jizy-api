import { test, expect } from '@jest/globals';
import { param } from '../lib/js/Api.js';

test('param: empty object → empty string', () => {
    expect(param({})).toBe('');
});

test('param: simple scalar object', () => {
    expect(param({ a: 1 })).toBe('a=1');
    expect(param({ a: 1, b: 'two' })).toBe('a=1&b=two');
});

test('param: nested object → bracket notation', () => {
    expect(param({ x: { y: 1 } })).toBe('x%5By%5D=1');
    expect(param({ a: { b: { c: 'd' } } })).toBe('a%5Bb%5D%5Bc%5D=d');
});

test('param: arrays → []-suffixed bracket notation', () => {
    expect(param({ arr: [1, 2, 3] })).toBe('arr%5B%5D=1&arr%5B%5D=2&arr%5B%5D=3');
});

test('param: spaces in values are encoded as `+` (not %20)', () => {
    expect(param({ q: 'hello world' })).toBe('q=hello+world');
});

test('param: special characters are URL-encoded', () => {
    expect(param({ q: 'a&b' })).toBe('q=a%26b');
    expect(param({ q: 'x=y' })).toBe('q=x%3Dy');
});

test('param: undefined values become empty string; null values are dropped', () => {
    // null is `typeof === 'object'` so it's recursed-into and yields no keys —
    // the pair is silently omitted. undefined falls through to parts.add and
    // is rendered as `key=`.
    expect(param({ a: null, b: undefined })).toBe('b=');
});

test('param: function values are invoked and their return is encoded', () => {
    expect(param({ a: () => 'lazy' })).toBe('a=lazy');
});

test('param: array of {name, value} at root → flat key=value pairs', () => {
    expect(param([
        { name: 'a', value: 1 },
        { name: 'b', value: 'two' }
    ])).toBe('a=1&b=two');
});

test('param: nested object inside array element keeps bracket notation', () => {
    expect(param({ users: [{ id: 1 }, { id: 2 }] })).toBe('users%5B%5D%5Bid%5D=1&users%5B%5D%5Bid%5D=2');
});
