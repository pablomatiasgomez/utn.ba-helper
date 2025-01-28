if (!window.UtnBaHelper) window.UtnBaHelper = {};
UtnBaHelper.Utils = function (apiConnector) {
	// TODO utils eventually shouldn't be instantiated and should be a set of functions.
	//  But we need to get rid of using apiConnector here.

	let failedToFetchErrors = 0;

	const delay = (delayMs) => {
		return result => new Promise(resolve => setTimeout(() => resolve(result), delayMs));
	}

	// TODO this is duplicated in the ApiConnector.
	let backgroundFetch = function (options) {
		return new Promise((resolve, reject) => {
			chrome.runtime.sendMessage(options, response => (response && response.errorStr) ? reject(new Error(response.errorStr)) : resolve(response));
		});
	};

	let injectScript = function (filePath) {
		let script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = chrome.runtime.getURL(filePath);
		document.head.appendChild(script);
	};

	let stringifyError = function (error) {
		if (error instanceof Error) {
			// Stack can include the message in some errors, but not in all cases.
			let message = error.toString();
			if (error.stack.startsWith(message)) {
				return error.stack;
			} else {
				return message + "\n" + error.stack;
			}
		}
		if (typeof error === "object") {
			return JSON.stringify(error);
		}
		return error + "";
	};

	let wrapError = function (message, error) {
		let newError = new Error(message);
		// Remove this function (wrapError) call from the stack...
		let newStack = newError.stack.split("\n");
		newStack.splice(1, 1);
		newStack = newStack.join("\n");
		newError.stack = `${newStack}\nCaused by: ${error.stack}`;
		return newError;
	};

	/**
	 * Wraps a function that is triggered from an async event, and handles errors by logging them to the api.
	 */
	let runAsync = function (name, fn) {
		// Start with Promise.resolve() as we don't know if fn returns promise or not.
		return Promise.resolve().then(() => {
			return fn();
		}).catch(e => {
			console.error(`Error while executing ${name}`, e);
			// Not logging LoggedOutError nor GuaraniBackendError.
			if (e instanceof LoggedOutError || e instanceof GuaraniBackendError) return;
			let errStr = stringifyError(e);
			// Skip first 5 Failed to fetch errors. We only want to know about these if it's failing for every request.
			// These are usually related to the user closing the tab, dns not resolving, etc, but we cannot get the details.
			if (errStr.includes("Failed to fetch") && ++failedToFetchErrors <= 3) return;
			return apiConnector.logMessage(name, true, errStr);
		});
	};

	let waitForElementToHide = function (selector) {
		return new Promise((resolve) => {
			let check = () => {
				if (!$(selector).is(":visible")) {
					resolve();
				} else {
					setTimeout(check, 100);
				}
			};
			check();
		});
	};

	// ----

	let getSchedulesAsString = function (schedules) {
		if (!schedules) return "-";
		return schedules
			.map(schedule =>
				UtnBaHelper.Consts.DAYS[schedule.day] + " (" + UtnBaHelper.Consts.TIME_SHIFTS[schedule.shift] + ") " +
				UtnBaHelper.Consts.HOURS[schedule.shift][schedule.firstHour].start + "hs a " + UtnBaHelper.Consts.HOURS[schedule.shift][schedule.lastHour].end + "hs")
			.join(" y ");
	};

	let getColorForAvg = function (avg, alpha = 1) {
		if (avg < 60) {
			return `rgba(213, 28, 38, ${alpha})`; // "#D51C26";
		} else if (avg >= 80) {
			return `rgba(25, 177, 53, ${alpha})`; // "#19B135";
		} else {
			return `rgba(244, 210, 36, ${alpha})`; // "#F4D224";
		}
	};

	let getOverallScoreSpan = function (overallScore) {
		return `<span style="border: 1px solid grey; background-color: ${getColorForAvg(overallScore)}">${overallScore}</span>`;
	};

	let getProfessorLi = function (professor) {
		let fontSize = professor.kind === "DOCENTE" ? "13px" : "11px";
		if (typeof professor.overallScore === "undefined") {
			// If we do not have surveys we do not show the score nor the link.
			return `<li style="font-size: ${fontSize}">${professor.name} (${professor.role})</li>`;
		}
		return `<li style="font-size: ${fontSize}">
			${getOverallScoreSpan(professor.overallScore)}
			<a class="no-ajax" href="${UtnBaHelper.CustomPages.getProfessorSurveyResultsUrl(professor.name)}" target="_blank">${professor.name}</a> (${professor.role})
		</li>`;
	};

	// Public
	return {
		// Related to the extension:
		delay: delay,
		backgroundFetch: backgroundFetch,
		injectScript: injectScript,
		wrapError: wrapError,
		runAsync: runAsync,
		waitForElementToHide: waitForElementToHide,

		//--
		getSchedulesAsString: getSchedulesAsString,
		getColorForAvg: getColorForAvg,
		getOverallScoreSpan: getOverallScoreSpan,
		getProfessorLi: getProfessorLi,
	};
};
