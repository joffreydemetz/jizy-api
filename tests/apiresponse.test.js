import { test, expect } from '@jest/globals';
import ApiResponse from '../lib/js/ApiResponse.js';

test('reload from the server is kept', () => {
    expect(new ApiResponse({ success: true, reload: true }).reload).toBe(true);
});

test('reload defaults to false and only true counts', () => {
    expect(new ApiResponse({}).reload).toBe(false);
    expect(new ApiResponse({ reload: 1 }).reload).toBe(false);
    expect(new ApiResponse(null).reload).toBe(false);
});

test('a transport exception is kept for the callback', () => {
    const response = new ApiResponse({ exception: 'Network timeout' });
    expect(response.exception).toBe('Network timeout');
    expect(response.success).toBe(false);
});

test('known fields are still copied', () => {
    const response = new ApiResponse({ success: true, data: { id: 1 }, error: 'e', message: 'm', info: 'i' });
    expect(response).toMatchObject({ success: true, data: { id: 1 }, error: 'e', message: 'm', info: 'i', exception: '' });
});
