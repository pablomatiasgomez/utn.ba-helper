function LoggedOutError() {
	this.name = 'LoggedOutError';
	this.message = "User has been logged out!";
	this.stack = (new Error()).stack;
}

LoggedOutError.prototype = new Error;
