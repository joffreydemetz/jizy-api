
const defaultResponse = {
    success: false,
    reload: false,
    data: null,
    error: '',
    message: '',
    info: '',
    exception: ''
};

export default class ApiResponse {
    constructor(response) {
        response = response || {};
        response = { ...defaultResponse, ...response };

        this.success = response.success || false;
        // the server asks for a page reload (honoured by Api.onResponse)
        this.reload = response.reload === true;
        this.data = response.data || null;
        this.error = response.error || '';
        this.message = response.message || '';
        this.info = response.info || '';
        // transport failure (network error, timeout): the message, for the callback
        this.exception = response.exception || '';
    }
};
