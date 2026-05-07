
const defaultResponse = {
    success: false,
    reload: false,
    data: null,
    error: '',
    message: '',
    info: ''
};

export default class ApiResponse {
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
