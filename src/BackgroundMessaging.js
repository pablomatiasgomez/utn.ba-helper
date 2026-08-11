import {ExtensionMessageError} from './guarani/Errors.js';

/**
 * Sends a message to the background script and returns the response.
 * Wraps browser.runtime.sendMessage, handling known messaging errors (e.g. tab closed, event page inactive).
 */
export async function backgroundFetch(options) {
	let response;
	try {
		response = await browser.runtime.sendMessage(options);
	} catch (e) {
		// These errors happen when the user navigates away, closes the tab, or the event page is inactive.
		if (e.message?.includes("message channel closed")
			|| e.message?.includes("Receiving end does not exist")
			|| e.message?.includes("Could not establish connection")) {
			throw new ExtensionMessageError(e.message, {cause: e});
		}
		throw e;
	}
	if (response && response.error) {
		let error = new Error(response.error.message);
		let method = options.method || "GET";
		let {origin, pathname} = new URL(options.url);
		if (response.error.status) {
			error.name = `HttpError(${response.error.status} ${method} ${origin}${pathname})`;
		} else {
			error.name = `${response.error.name || "Error"}(${method} ${origin}${pathname})`;
		}
		throw error;
	}
	return response;
}