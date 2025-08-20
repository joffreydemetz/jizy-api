import jApi from './js/api.js';

export default class jAjax extends jApi {
    async transport() {
        if (this.data && this.method === 'GET') {
            // append query
            this.url = (url + '&' + this.data).replace(/[&?]{1,2}/, '?');
            this.data = undefined;
        }

        let url = this.url;
        let result = {};

        const xhr = new XMLHttpRequest();

        const timeoutId = setTimeout(() => {
            xhr.abort();
            result.exception = 'AJAX Request timeout';
        }, this.timeout);

        if (this.json === true) {
            xhr.overrideMimeType('application/json');
        }

        xhr.open(this.method, url);

        if (this.method === 'POST') {
            xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
        }

        xhr.onload = () => {
            clearTimeout(timeoutId);

            if (xhr.status === 0) {
                result.exception = 'AJAX Request aborted';
                return;
            }

            result.status = xhr.status;

            const responseText = xhr.responseText;
            result.responseText = responseText;

            if (xhr.status >= 200 && xhr.status < 400) {
                if (this.method === 'POST' && responseText === '') {
                }
                else if (this.json === true) {
                    try {
                        const responseData = JSON.parse(responseText);
                        result = Object.assign(result, responseData);
                    } catch (e) {
                        result.exception = 'Invalid JSON';
                    }
                }
            } else {
                result.exception = 'AJAX request failed';
            }
        };

        xhr.onerror = () => {
            clearTimeout(timeoutId);
            result.exception = 'AJAX Request.onerror';
        };

        try {
            xhr.send(this.data || null);
        } catch (e) {
            if (e === 'net::ERR_NETWORK_IO_SUSPENDED') {
                result.exception = 'Connection lost .. reload the page';
            } else {
                result.exception = 'AJAX Request.send';
            }
        }

        return result;
    }
};
