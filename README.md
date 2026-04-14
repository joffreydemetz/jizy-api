
# jizy-api
API transport library (fetch/xhr proxies)

## `lib/js` Directory

This folder contains the core JavaScript modules for API transport:

- **fetch.js**: Provides utility functions for making fetch requests and handling responses.
- **ajax.js**: Implements a lightweight AJAX wrapper for XMLHttpRequest.
- **api.js**: Contains the main functions for working with API endpoints and requests.

## Usage Example

```js
import { jFetch } from 'jizy-api';

// Create a new API instance
const api = new jFetch()
	.setUrl('https://api.example.com/data')
	.setMethod('GET')
	.withJson(true)
	.withDebug(true)
	.setCallback(() => {
		console.log('Callback');
	})
	.call();
```
