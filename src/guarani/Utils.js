export class Utils {

	#apiConnector;

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
	 * Wraps a function that is triggered from an async event, logging errors to the console.
	 */
	runAsync(name, fn) {
		// Wrap with Promise.resolve() to safely handle both async and non-async functions.
		Promise.resolve().then(() => {
			return fn();
		}).catch(e => {
			console.error(`Error while executing ${name}`, e);
		});
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