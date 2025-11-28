import $ from 'jquery';
import {Consts} from './Consts.js';
import {LoggedOutError, GuaraniBackendError, MissingStudentIdError} from './Errors.js';
import {log} from "@embrace-io/web-sdk";
import {CustomPages} from './custompages/CustomPages.js';

export class Utils {
	// TODO utils eventually shouldn't be instantiated and should be a set of functions.
	//  But we need to get rid of using apiConnector here.

	#apiConnector;
	#failedToFetchErrors = 0;

	constructor(apiConnector) {
		this.#apiConnector = apiConnector;
	}

	// Related to the extension:
	delay(delayMs) {
		return result => new Promise(resolve => setTimeout(() => resolve(result), delayMs));
	}

	// TODO this is duplicated in the ApiConnector.
	backgroundFetch(options) {
		return new Promise((resolve, reject) => {
			chrome.runtime.sendMessage(options, response => (response && response.errorStr) ? reject(new Error(response.errorStr)) : resolve(response));
		});
	}

	injectScript(filePath) {
		let script = document.createElement('script');
		script.type = 'text/javascript';
		script.src = chrome.runtime.getURL(filePath);
		document.head.appendChild(script);
	}

	#stringifyError(error) {
		if (error instanceof Error) {
			let message = error.toString();
			let result = error.stack;

			// `stack` usually includes the message in the first line, but not in all cases.
			if (!error.stack.startsWith(message)) {
				result = message + "\n" + error.stack;
			}

			// Include the cause chain if present
			if (error.cause) {
				result += "\nCaused by: " + this.#stringifyError(error.cause);
			}

			return result;
		}
		if (typeof error === "object") {
			return JSON.stringify(error);
		}
		return error + "";
	}

	/**
	 * Wraps a function that is triggered from an async event, and handles errors by logging them to the api.
	 */
	runAsync(name, fn) {
		// Start with Promise.resolve() as we don't know if fn returns promise or not.
		return Promise.resolve().then(() => {
			return fn();
		}).catch(e => {
			console.error(`Error while executing ${name}`, e);
			// Not logging errors that we can't do anything.
			if (e instanceof LoggedOutError || e instanceof GuaraniBackendError || e instanceof MissingStudentIdError) return;

			// Log to Embrace
			log.logException(e, {handled: true, attributes: {name: name}});

			// Log to our backend
			let errStr = this.#stringifyError(e);
			// Skip first 2 Failed to fetch errors. We only want to know about these if it's failing for every request.
			// These are usually related to the user closing the tab, dns not resolving, etc., but we cannot get the details.
			if (errStr.includes("Failed to fetch") && ++this.#failedToFetchErrors <= 2) return;
			return this.#apiConnector.logMessage(name, true, errStr);
		});
	}

	waitForElementToHide(selector) {
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
	}

	// ----

	getSchedulesAsString(schedules) {
		if (!schedules) return "-";
		return schedules
			.map(schedule =>
				Consts.DAYS[schedule.day] + " (" + Consts.TIME_SHIFTS[schedule.shift] + ") " +
				Consts.HOURS[schedule.shift][schedule.firstHour].start + "hs a " + Consts.HOURS[schedule.shift][schedule.lastHour].end + "hs")
			.join(" y ");
	}

	getColorForAvg(avg, alpha = 1) {
		if (avg < 60) {
			return `rgba(213, 28, 38, ${alpha})`; // "#D51C26";
		} else if (avg >= 80) {
			return `rgba(25, 177, 53, ${alpha})`; // "#19B135";
		} else {
			return `rgba(244, 210, 36, ${alpha})`; // "#F4D224";
		}
	}

	getOverallScoreSpan(overallScore) {
		return `<span style="border: 1px solid grey; background-color: ${this.getColorForAvg(overallScore)}">${overallScore}</span>`;
	}

	getProfessorLi(professor) {
		let fontSize = professor.kind === "DOCENTE" ? "13px" : "11px";
		if (typeof professor.overallScore === "undefined") {
			// If we do not have surveys we do not show the score nor the link.
			return `<li style="font-size: ${fontSize}">${professor.name} (${professor.role})</li>`;
		}
		return `<li style="font-size: ${fontSize}">
			${this.getOverallScoreSpan(professor.overallScore)}
			<a class="no-ajax" href="${CustomPages.getProfessorSurveyResultsUrl(professor.name)}" target="_blank">${professor.name}</a> (${professor.role})
		</li>`;
	}
}
