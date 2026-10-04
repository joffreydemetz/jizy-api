import jApi from './Api.js';

export function buildAjaxUrl(method, url, data) {
    if (data && method === 'GET') {
        return (url + '&' + data).replace(/[&?]{1,2}/, '?');
    }
    return url;
}

export function applyJsonResponse(result, responseText) {
    try {
        Object.assign(result, JSON.parse(responseText));
    } catch (e) {
        result.exception = 'Invalid JSON';
    }
    return result;
}

export function classifySendError(error) {
    if (error === 'net::ERR_NETWORK_IO_SUSPENDED') {
        return 'Connection lost .. reload the page';
    }
    return 'AJAX Request.send';
}

export default class jAjax extends jApi {
    async transport() {
        return new Promise((resolve) => {
            const result = {};
            const url = buildAjaxUrl(this.method, this.url, this.data);
            if (this.data && this.method === 'GET') this.data = undefined;

            const xhr = new XMLHttpRequest();
            const timeoutId = setTimeout(() => this.handleTimeout(xhr, result, resolve), this.timeout);

            this.configureXhr(xhr, url);
            xhr.onload = () => this.handleLoad(xhr, result, resolve, timeoutId);
            xhr.onerror = () => this.handleError(result, resolve, timeoutId);
            this.dispatchSend(xhr, result, resolve, timeoutId);
        });
    }

    configureXhr(xhr, url) {
        if (this.json === true) {
            xhr.overrideMimeType('application/json');
        }
        xhr.open(this.method, url);
        if (this.method === 'POST') {
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
        }
    }

    handleTimeout(xhr, result, resolve) {
        xhr.abort();
        result.exception = 'AJAX Request timeout';
        resolve(result);
    }

    handleLoad(xhr, result, resolve, timeoutId) {
        clearTimeout(timeoutId);

        if (xhr.status === 0) {
            result.exception = 'AJAX Request aborted';
            resolve(result);
            return;
        }

        result.status = xhr.status;
        result.responseText = xhr.responseText;

        if (xhr.status >= 200 && xhr.status < 400) {
            const skipParse = this.method === 'POST' && xhr.responseText === '';
            if (!skipParse && this.json === true) {
                applyJsonResponse(result, xhr.responseText);
            }
        } else {
            result.exception = 'AJAX request failed';
        }

        resolve(result);
    }

    handleError(result, resolve, timeoutId) {
        clearTimeout(timeoutId);
        result.exception = 'AJAX Request.onerror';
        resolve(result);
    }

    dispatchSend(xhr, result, resolve, timeoutId) {
        try {
            xhr.send(this.data || null);
        } catch (e) {
            clearTimeout(timeoutId);
            result.exception = classifySendError(e);
            resolve(result);
        }
    }
};
