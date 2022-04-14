function LoggedOutError() {
	this.name = 'LoggedOutError';
	this.message = "User has been logged out!";
	this.stack = (new Error()).stack;
}

LoggedOutError.prototype = new Error;

// GuaraniBackendError is thrown when the Guarani's server is not working correctly.
function GuaraniBackendError(error) {
	this.name = 'GuaraniBackendError';
	this.message = "Guarani's backend throw an error";
	this.stack = (new Error()).stack;
	this.error = error;
}

GuaraniBackendError.prototype = new Error;
