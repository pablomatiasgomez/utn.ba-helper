import {isIgnoredError, stringifyError} from './Errors.js';
import {log} from "@embrace-io/web-sdk";

export class Utils {

	#apiConnector;
	#failedToFetchErrors = 0;

	constructor(apiConnector) {
		this.#apiConnector = apiConnector;
	}

	injectScript(filePath, removeAfterLoad = false) {
		return new Promise((resolve, reject) => {
			let script = document.createElement('script');
			script.type = 'text/javascript';
			script.src = chrome.runtime.getURL(filePath);
			script.onload = () => {
				if (removeAfterLoad) script.remove();
				resolve();
			};
			script.onerror = () => reject(new Error(`Failed to load script: ${filePath}`));
			document.head.appendChild(script);
		});
	}

	/**
	 * Wraps a function that is triggered from an async event, and handles errors by logging them to the api.
	 */
	runAsync(name, fn) {
		// Wrap with Promise.resolve() to safely handle both async and non-async functions.
		Promise.resolve().then(() => {
			return fn();
		}).catch(e => {
			console.error(`Error while executing ${name}`, e);
			// Not logging errors that we can't do anything.
			if (isIgnoredError(e)) return;

			let errStr = stringifyError(e);
			// Skip first 2 Failed to fetch errors. We only want to know about these if it's failing for every request.
			// These are usually related to the user closing the tab, dns not resolving, etc., but we cannot get the details.
			if (errStr.includes("Failed to fetch") && ++this.#failedToFetchErrors <= 2) return;

			// Log to Embrace
			log.logException(e, {handled: false, attributes: {name: name}});

			// Log to our backend
			return this.#apiConnector.logMessage(name, true, errStr);
		});
	}

	/**
	 * logHTML is used to report the entire HTML or debug purposes
	 * Can be called with a given pct of users to sample.
	 * E.g.
	 * 	this.#utils.logHTML("HorariosPage", 10);
	 */
	logHTML(name, pct) {
		// Only log for a percentage of users
		if (Math.random() * 100 >= pct) return;

		let message = `HTML log for ${name}`;
		let html = document.documentElement.outerHTML;
		log.message(message, 'warning', {
			attributes: {
				name: name,
				html: html
			}
		});
		return this.#apiConnector.logMessage(message, false, `HTML log for ${name}. HTML: ${html}`);
	}

	waitForElementToHide(selector) {
		return new Promise((resolve) => {
			let check = () => {
				let el = document.querySelector(selector);
				// Matches jQuery's :visible — element absent or has zero offset dimensions.
				if (!el || (el.offsetWidth === 0 && el.offsetHeight === 0)) {
					resolve();
				} else {
					setTimeout(check, 100);
				}
			};
			check();
		});
	}
}
