import jApi from './api.js';

function appendQuery(url, query) {
    if (!query) return url;
    return (url + '&' + query).replace(/[&?]{1,2}/, '?');
}

export default class jFetch extends jApi {
    async transport() {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        let fetchOptions = {
            method: this.method,
            body: null,
            headers: {},
            signal: controller.signal
        };

        // Set Accept header for JSON if requested
        if (this.json === true) {
            fetchOptions.headers['Accept'] = 'application/json';
        }

        let url = this.url;
        let result = {};

        if (this.method === 'POST') {
            if (this.json === true) {
                fetchOptions.headers['Content-Type'] = 'application/json; charset=UTF-8';

                if (this.data) {
                    try {
                        fetchOptions.body = typeof this.data === 'string' ? this.data : JSON.stringify(this.data);
                    } catch (e) {
                        clearTimeout(timeoutId);
                        result.url = url;
                        result.exception = 'Invalid JSON input data';
                        return Promise.resolve(result);
                    }
                }
            } else {
                fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
                fetchOptions.headers['Accept'] = 'text/plain';
                if (this.data) {
                    fetchOptions.body = this.data;
                }
            }
        }
        else if (this.method === 'GET') {
            if (this.data) {
                url = appendQuery(url, this.data);
                this.data = null;
            }
        }
        else {
            fetchOptions.headers['Accept'] = 'text/plain';
            if (this.method === 'DELETE') {
                if (this.data) {
                    fetchOptions.body = this.data;
                }
            } else if (this.method === 'PUT' || this.method === 'PATCH') {
                if (this.json === true) {
                    fetchOptions.headers['Content-Type'] = 'application/json; charset=UTF-8';
                    if (this.data) {
                        try {
                            fetchOptions.body = typeof this.data === 'string' ? this.data : JSON.stringify(this.data);
                        } catch (e) {
                            clearTimeout(timeoutId);
                            result.url = url;
                            result.exception = 'Invalid JSON data';
                            return Promise.resolve(result);
                        }
                    }
                } else {
                    fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
                    if (this.data) {
                        fetchOptions.body = this.data;
                    }
                }
            }
        }

        return fetch(url, fetchOptions).then(async response => {
            clearTimeout(timeoutId);
            result.url = url;
            result.status = response.status;

            const responseText = await response.text();
            result.responseText = responseText;
            if (response.ok) {
                if (this.method === 'POST' && responseText === '') {
                    // If POST response is empty, return empty object
                    return result;
                }


                if (this.json === true) {
                    try {
                        const responseData = JSON.parse(responseText);
                        result = Object.assign(result, responseData);
                    } catch (e) {
                        result.exception = 'Invalid JSON response';
                    }
                }

                return result;
            }

            result.exception = 'AJAX Response failed';

            return result;
        }).catch(e => {
            clearTimeout(timeoutId);

            if (e.name === 'AbortError') {
                result.exception = 'AJAX Request timeout';
                return result;
            }

            result.exception = 'AJAX Request failed';
            return result;
        });
    }
};

