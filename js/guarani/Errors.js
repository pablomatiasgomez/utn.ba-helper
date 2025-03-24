// RedirectedToHomeError is thrown when a request to Guarani's backend returns that the user's session is expired.
class LoggedOutError extends Error {
	constructor(message = "User has been logged out!", options) {
		super(message, options);
		this.name = "LoggedOutError";
	}
}

// RedirectedToHomeError is thrown when a request to Guarani's backend returns that the user was redirected to the home.
class RedirectedToHomeError extends Error {
	constructor(message = "Request has been redirected to home", options) {
		super(message, options);
		this.name = "RedirectedToHomeError";
	}
}

// GuaraniBackendError is thrown when the Guarani's server is not working correctly.
class GuaraniBackendError extends Error {
	constructor(message, options) {
		super(message, options);
		this.name = "GuaraniBackendError";
	}
}

// MissingStudentIdError is thrown when the studentId is not present.
// This seems to happen in a few cases where the student was not yet assigned an ID?
class MissingStudentIdError extends Error {
	constructor(message, options) {
		super(message, options);
		this.name = "MissingStudentIdError";
	}
}
