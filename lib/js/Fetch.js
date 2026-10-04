import jApi from './Api.js';

export function appendQuery(url, query) {
    if (!query) return url;
    return (url + '&' + query).replace(/[&?]{1,2}/, '?');
}

export function buildFetchHeaders(method, json) {
    const headers = {};
    if (json === true) {
        headers['Accept'] = 'application/json';
    }

    if (method === 'POST') {
        if (json === true) {
            headers['Content-Type'] = 'application/json; charset=UTF-8';
        } else {
            headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
            headers['Accept'] = 'text/plain';
        }
    } else if (method !== 'GET') {
        // Non-POST non-GET: Accept overridden to text/plain (preserved quirk:
        // PUT/PATCH + json=true ends up with Accept=text/plain even though
        // Content-Type=application/json — matches the original behavior).
        headers['Accept'] = 'text/plain';
        if (method === 'PUT' || method === 'PATCH') {
            if (json === true) {
                headers['Content-Type'] = 'application/json; charset=UTF-8';
            } else {
                headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
            }
        }
    }

    return headers;
}

export function buildFetchBody(method, json, data) {
    if (!data) return { body: null };

    if (method === 'POST') {
        if (json === true) {
            try {
                return { body: typeof data === 'string' ? data : JSON.stringify(data) };
            } catch (e) {
                return { body: null, error: 'Invalid JSON input data' };
            }
        }
        return { body: data };
    }

    if (method === 'DELETE') {
        return { body: data };
    }

    if (method === 'PUT' || method === 'PATCH') {
        if (json === true) {
            try {
                return { body: typeof data === 'string' ? data : JSON.stringify(data) };
            } catch (e) {
                return { body: null, error: 'Invalid JSON data' };
            }
        }
        return { body: data };
    }

    return { body: null };
}

export function classifyFetchError(error) {
    if (error && error.name === 'AbortError') return 'AJAX Request timeout';
    return 'AJAX Request failed';
}

export default class jFetch extends jApi {
    async transport() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        let url = this.url;
        const result = {};

        if (this.method === 'GET' && this.data) {
            url = appendQuery(url, this.data);
            this.data = null;
        }

        const { body, error: bodyError } = buildFetchBody(this.method, this.json, this.data);
        if (bodyError) {
            clearTimeout(timeoutId);
            result.url = url;
            result.exception = bodyError;
            return result;
        }

        const fetchOptions = {
            method: this.method,
            body,
            headers: buildFetchHeaders(this.method, this.json),
            signal: controller.signal
        };

        return fetch(url, fetchOptions)
            .then(async (response) => {
                clearTimeout(timeoutId);
                await this.parseResponse(result, url, response);
                return result;
            })
            .catch((e) => {
                clearTimeout(timeoutId);
                this.handleFetchError(result, e);
                return result;
            });
    }

    async parseResponse(result, url, response) {
        result.url = url;
        result.status = response.status;
        const responseText = await response.text();
        result.responseText = responseText;

        if (!response.ok) {
            result.exception = 'AJAX Response failed';
            return;
        }

        if (this.method === 'POST' && responseText === '') {
            return;
        }

        if (this.json === true) {
            try {
                Object.assign(result, JSON.parse(responseText));
            } catch (e) {
                result.exception = 'Invalid JSON response';
            }
        }
    }

    handleFetchError(result, error) {
        result.exception = classifyFetchError(error);
    }
};
