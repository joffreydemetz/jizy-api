/**
 * Serializes an object or array into a URL-encoded query string.
 * Handles nested objects and arrays using bracket notation.
 * Example: {foo: 'bar', arr: [1,2]} => 'foo=bar&arr[]=1&arr[]=2'
 *
 * @param {Object|Array} input - The object or array to serialize
 * @returns {string} - The URL-encoded query string
 */
function param(input) {
    const parts = [];

    // Helper to add a key-value pair to the parts array
    parts.add = function (key, value) {
        value = typeof value === 'function' ? value() : value;
        value = value == null ? '' : value;
        this.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
    };

    // Recursively build key-value pairs for nested objects/arrays
    function buildParams(obj, prefix) {
        if (prefix) {
            if (Array.isArray(obj)) {
                for (let i = 0; i < obj.length; i++) buildParams(obj[i], prefix + '[]');
            } else if (typeof obj === 'object') {
                for (const key in obj) buildParams(obj[key], prefix + '[' + key + ']');
            } else {
                parts.add(prefix, obj);
            }
        } else {
            if (Array.isArray(obj)) {
                for (let i = 0; i < obj.length; i++) buildParams(obj[i].value, obj[i].name);
            } else if (typeof obj === 'object') {
                for (const key in obj) buildParams(obj[key], key);
            } else {
                parts.add(prefix, obj);
            }
        }
        return parts;
    }

    return buildParams(input, '').join('&').replace(/%20/g, '+');
}

function toQueryString(vars) {
    const params = [];
    for (let key in vars) {
        if (Array.isArray(vars[key])) {
            for (let val of vars[key]) {
                params.push(`${encodeURIComponent(key)}[]=${encodeURIComponent(val)}`);
            }
        } else {
            params.push(`${encodeURIComponent(key)}=${encodeURIComponent(vars[key])}`);
        }
    }
    return params.length ? '?' + params.join('&') : '';
}

const defaultConfig = {
    method: 'GET',
    json: true,
    timeout: 5000,
    reloadTimeout: 2000,
    data: null,
    messengerConfig: {}
};

const defaultResponse = {
    success: false,
    reload: false,
    data: null,
    error: '',
    message: '',
    info: ''
};

class ApiResponse {
    constructor(response) {
        response = response || {};
        response = { ...defaultResponse, ...response };

        this.success = response.success || false;
        this.data = response.data || null;
        this.error = response.error || '';
        this.message = response.message || '';
        this.info = response.info || '';
    }
};

export default class jApi {
    constructor() {
        this.method = defaultConfig.method;
        this.json = defaultConfig.json;
        this.timeout = defaultConfig.timeout;
        this.reloadTimeout = defaultConfig.reloadTimeout;
        this.messengerConfig = defaultConfig.messengerConfig;
        this.data = defaultConfig.data;
        this.debug = false;
        this.url = '';
        this.response = null;
    }

    withDebug(debug = true) {
        this.debug = debug;
        return this;
    }

    withJson(json = true) {
        this.json = json;
        return this;
    }

    setUrl(url) {
        this.url = url;
        return this;
    }

    setMessenger(messenger) {
        this.messenger = messenger;
        return this;
    }

    setMessengerConfig(messengerConfig) {
        this.messengerConfig = messengerConfig;
        return this;
    }

    setMethod(method = 'GET') {
        this.method = method.toUpperCase();
        return this;
    }

    setTimeout(timeout) {
        this.timeout = timeout;
        return this;
    }

    setData(data) {
        this.data = data;
        return this;
    }

    sets(settings) {
        settings = settings || {};

        if (typeof settings.url === 'string') {
            this.setUrl(settings.url);
        }

        if (typeof settings.method === 'string') {
            this.setMethod(settings.method);
        }

        if (typeof settings.timeout === 'number') {
            this.setTimeout(settings.timeout);
        }

        if (typeof settings.json === 'boolean') {
            this.withJson(settings.json);
        }

        if (typeof settings.messengerConfig === 'object') {
            this.setMessengerConfig(settings.messengerConfig);
        }

        if (typeof settings.data !== 'undefined') {
            this.setData(settings.data);
        }

        return this;
    }

    call() {
        this.logMessage('api.call');
        this.logMessage('  URL: ' + this.url);
        this.logMessage('  Method: ' + this.method);
        this.logMessage('  JSON: ' + this.json);
        this.logMessage('  Data: ' + JSON.stringify(this.data));

        if (typeof this.url !== 'string' || this.url.trim() === '') {
            throw new Error('Invalid Api call URL');
        }

        // For POST/PUT/PATCH with json: true, 
        // keep data as object for JSON.stringify
        let data = null;
        if (settings.data) {
            if (this.json === true && (this.method === 'POST' || this.method === 'PUT' || this.method === 'PATCH')) {
                data = settings.data; // keep as object or string
            } else if (typeof settings.data !== 'string') {
                data = param(settings.data); // url-encode for form
            } else {
                data = settings.data;
            }
        }
        this.setData(data);

        this.transport().then((response) => {
            this.response = new ApiResponse(response);
        }).catch((error) => {
            this.response = new ApiResponse({ exception: error.message });
        });

        return this;
    }

    response(callback) {
        this.logMessage('-- Response:');
        this.logMessage(this.response, 'dir');

        if (this.response.error) {
            this.displayMessage(this.response.error, 'error', this.messengerConfig);
        }

        if (this.response.message) {
            this.displayMessage(this.response.message, 'message', this.messengerConfig);
        }

        if (this.response.info) {
            const messengerConfig = {
                dismissible: false,
                persistant: false,
                timeout: 3
            };
            this.displayMessage(this.response.info, 'info', { ...this.messengerConfig, ...messengerConfig });
        }

        if (typeof callback === 'function') {
            if (false === callback(this.response)) {
                this.response.reload = false;
            }
        }

        if (this.response.reload) {
            if (true === this.debug) {
                this.logMessage('Reload page after ajax failure');
                return;
            }

            setTimeout(() => window.location.reload(true), this.reloadTimeout);
        }
    }

    logMessage(message, method = 'debug') {
        if (!this.debug) {
            return;
        }
        console[method](message);
    }

    displayMessage(message, type, config) {
        if (this.messenger instanceof jMessenger) {
            this.messenger(message, type, config);
        } else {
            this.logMessage('No messenger specified for displayMessage', 'error');
            this.logMessage('[' + type + '] ' + message);
            alert('[' + type + '] ' + message);
        }
    }

    transport() {
        // needs to be implemented in the specific transport layer
        throw new Error('API transport layer not implemented');
    }

    /** 
     * Shortcuts methods
     * These methods are used to make API calls with the specified HTTP method
     * Uses json response by default
     * Chain withJson(false) to disable JSON response
     */
    init(url, settings) {
        // Initialization method to set up the API call with URL and settings
        settings = { ...defaultConfig, ...settings };
        settings.url = url;
        return this.sets(settings);
    }

    get(url, cfg) {
        cfg = cfg || {};
        cfg.method = 'GET';
        cfg.json = true;

        if (typeof cfg.userData !== 'undefined') {
            cfg.data = toQueryString(cfg.userData);
            delete cfg.userData;
        }

        return this.init(url, cfg);
    }

    post(url, cfg) {
        cfg = cfg || {};
        cfg.method = 'POST';
        cfg.json = true;

        return this.init(url, cfg);
    }

    put(url, cfg) {
        cfg = cfg || {};
        cfg.method = 'PUT';
        cfg.json = true;

        return this.init(url, cfg);
    }

    patch(url, cfg) {
        cfg = cfg || {};
        cfg.method = 'PATCH';
        cfg.json = true;

        return this.init(url, cfg);
    }

    delete(url, cfg) {
        cfg = cfg || {};
        cfg.method = 'DELETE';
        cfg.json = true;

        return this.init(url, cfg);
    }
};
