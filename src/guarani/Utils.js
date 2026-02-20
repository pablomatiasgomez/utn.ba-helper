import $ from 'jquery';
import {Consts} from './Consts.js';
import {isIgnoredError, stringifyError} from './Errors.js';
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

	// TODO this is duplicated in the ApiConnector.
	async backgroundFetch(options) {
		let response = await chrome.runtime.sendMessage(options);
		if (response && response.errorStr) throw new Error(response.errorStr);
		return response;
	}

	injectScript(filePath, removeAfterLoad = false) {
		return new Promise((resolve, reject) => {
			let script = document.createElement('script');
			script.type = 'text/javascript';
			let scriptUrl = chrome.runtime.getURL(filePath);
			script.src = scriptUrl;
			script.onload = () => {
				if (removeAfterLoad) script.remove();
				resolve();
			};
			script.onerror = () => {
				let contextInvalidated = typeof chrome.runtime?.id === 'undefined';
				reject(new Error(`Failed to load script: ${filePath}. URL: ${scriptUrl}. Extension context invalidated: ${contextInvalidated}`));
			};
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
			if (isIgnoredError(e)) {
				log.logException(e, {handled: true, attributes: {name: name}});
				return;
			}

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

	/**
	 * Removes the existent "powered by banner", if any.
	 */
	removePoweredByUTNBAHelper() {
		document.querySelector(".powered-by-utnba-helper")?.remove();
	}

	/**
	 * Appends the "powered by banner", unless it already exists.
	 */
	addPoweredByUTNBAHelper() {
		if (!!document.querySelector(".powered-by-utnba-helper")) return;
		document.querySelector(".user-navbar").closest(".row-fluid")
			.insertAdjacentHTML('afterbegin', `<a class="powered-by-utnba-helper" href="https://chromewebstore.google.com/detail/utnba-helper-ex-siga-help/jdgdheoeghamkhfppapjchbojhehimpe" target="_blank">POWERED BY UTN.BA HELPER</a>`);
	}


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
