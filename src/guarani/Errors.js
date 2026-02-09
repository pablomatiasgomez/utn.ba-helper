// RedirectedToHomeError is thrown when a request to Guarani's backend returns that the user's session is expired.
export class LoggedOutError extends Error {
	constructor(message = "User has been logged out!", options) {
		super(message, options);
		this.name = "LoggedOutError";
	}
}

// RedirectedToHomeError is thrown when a request to Guarani's backend returns that the user was redirected to the home.
export class RedirectedToHomeError extends Error {
	constructor(message = "Request has been redirected to home", options) {
		super(message, options);
		this.name = "RedirectedToHomeError";
	}
}

// GuaraniBackendError is thrown when the Guarani's server is not working correctly.
export class GuaraniBackendError extends Error {
	constructor(message, options) {
		super(message, options);
		this.name = "GuaraniBackendError";
	}
}

// MissingStudentIdError is thrown when the studentId is not present.
// This seems to happen in a few cases where the student was not yet assigned an ID?
export class MissingStudentIdError extends Error {
	constructor(message, options) {
		super(message, options);
		this.name = "MissingStudentIdError";
	}
}

// ProfileNotHandledError is thrown when the selected profile is one not handled by the extension.
export class ProfileNotHandledError extends Error {
	constructor(message, options) {
		super(message, options);
		this.name = "ProfileNotHandledError";
	}
}


// Errors that we don't want to log to our backend
const IGNORED_ERROR_TYPES = [LoggedOutError, GuaraniBackendError, MissingStudentIdError, ProfileNotHandledError];

/**
 * Checks if the given error or any error in its cause chain is of a type that should be ignored.
 * @param {Error} error - The error to check
 * @returns {boolean} - True if the error should be ignored
 */
export function isIgnoredError(error) {
	if (!error) return false;
	if (IGNORED_ERROR_TYPES.some(ErrorType => error instanceof ErrorType)) return true;
	return isIgnoredError(error.cause);
}

/**
 * Converts an error to a string representation, including the full cause chain.
 * @param {Error|Object|*} error - The error to stringify
 * @returns {string} - String representation of the error
 */
export function stringifyError(error) {
	if (error instanceof Error) {
		let message = error.toString();
		let result = error.stack || message;

		// `stack` usually includes the message in the first line, but not in all cases.
		if (error.stack && !error.stack.startsWith(message)) {
			result = message + "\n" + error.stack;
		}

		// Include the cause chain if present
		if (error.cause) {
			result += "\nCaused by: " + stringifyError(error.cause);
		}

		return result;
	}
	if (typeof error === "object") {
		return JSON.stringify(error);
	}
	return error + "";
}
