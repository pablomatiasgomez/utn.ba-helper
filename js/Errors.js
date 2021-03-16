function LoggedOutError(message) {
	this.name = 'LoggedOutError';
	this.message = message;
	this.stack = (new Error()).stack;
}

LoggedOutError.prototype = new Error;
