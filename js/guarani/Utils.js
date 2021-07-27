let Utils = function (apiConnector) {

	let injectScript = function (content) {
		let script = document.createElement('script');
		script.type = 'text/javascript';
		script.innerHTML = content;
		document.head.appendChild(script);
	};

	/**
	 * Attaches a handler to the utn ba events such as a changing a web page via ajax.
	 * @param eventKey the utn.ba event key
	 * @param handler the listener that will handle events
	 */
	let attachEvent = function (eventKey, handler) {
		let windowEventKey = `__ce_${eventKey}`;
		window.addEventListener(windowEventKey, e => {
			wrapEventFunction(eventKey, () => handler(e.detail));
		});
		injectScript(`kernel.evts.escuchar("${eventKey}", e => window.dispatchEvent(new CustomEvent("${windowEventKey}", {detail: e})), true);`);
	};

	let stringifyError = function (error) {
		if (error instanceof Error) return error.stack; // Stack includes the message
		if (typeof error === 'object') return JSON.stringify(error);
		return error;
	};

	let wrapError = function (message, error) {
		let newError = new Error(message);
		// Remove this function (wrapError) call from the stack..
		let newStack = newError.stack.split("\n");
		newStack.splice(1, 1);
		newStack = newStack.join("\n");
		newError.stack = `${newStack}\nCaused by: ${error.stack}`;
		return newError;
	};

	/**
	 * Wraps a function that is triggered from a separate event, and handles errors by logging them to the api.
	 */
	let wrapEventFunction = function (name, fn) {
		// Start with Promise.resolve() as we don't know if fn returns promise or not.
		Promise.resolve().then(() => {
			return fn();
		}).catch(e => {
			console.error(`Error while executing event handler for event ${name}`, e);
			return apiConnector.logMessage(`HandleEvent_${name}`, true, stringifyError(e));
		});
	};

	// ----
	// TODO: move all constants to a separate file and unify data model with api?
	const HOURS = {
		m: {
			0: {start: "7:45", end: "8:30"},
			1: {start: "8:30", end: "9:15"},
			2: {start: "9:15", end: "10:00"},
			3: {start: "10:15", end: "11:00"},
			4: {start: "11:00", end: "11:45"},
			5: {start: "11:45", end: "12:30"},
			6: {start: "12:30", end: "13:15"}
		},
		t: {
			0: {start: "13:30", end: "14:15"},
			1: {start: "14:15", end: "15:00"},
			2: {start: "15:00", end: "15:45"},
			3: {start: "16:00", end: "16:45"},
			4: {start: "16:45", end: "17:30"},
			5: {start: "17:30", end: "18:15"},
			6: {start: "18:15", end: "19:00"},
		},
		n: {
			0: {start: "18:15", end: "19:00"},
			1: {start: "19:00", end: "19:45"},
			2: {start: "19:45", end: "20:30"},
			3: {start: "20:45", end: "21:30"},
			4: {start: "21:30", end: "22:15"},
			5: {start: "22:15", end: "23:00"},
		}
	};
	const DAYS = {
		Lu: "Lunes",
		Ma: "Martes",
		Mi: "Miercoles",
		Ju: "Jueves",
		Vi: "Viernes",
		Sa: "Sabado"
	};
	const TIME_SHIFTS = {
		m: "Mañana",
		t: "Tarde",
		n: "Noche"
	};
	const BRANCHES = {
		"CAMPUS": "CAMPUS",
		"MEDRANO": "MEDRANO",
		"AULA_VIRTUAL": "AULA VIRTUAL",
		"PIÑERO": "PIÑERO",
	};
	const NEW_GRADES_REGULATION_DATE = new Date(2017, 2, 10); // Doesn't have to be exact.. just using March 10th.
	const WEIGHTED_GRADES = {
		// Segun ordenanza 1549
		1: 1,
		2: 2.67,
		3: 4.33,
		4: 6,
		5: 6.67,
		6: 7.33,
		7: 8,
		8: 8.67,
		9: 9.33,
		10: 10
	};

	let getWeightedGrade = function (date, grade) {
		if (date < NEW_GRADES_REGULATION_DATE) {
			return WEIGHTED_GRADES[grade];
		} else {
			return grade;
		}
	};

	/**
	 * @returns {{shift: string, firstHour: string, lastHour: string, day: string}}
	 */
	let getScheduleFromString = function (str) {
		str = str.replace("á", "a"); // This is for day Sá
		let groups = /^(Lu|Ma|Mi|Ju|Vi|Sa)\(([mtn])\)([0-6]):([0-6])$/.exec(str);
		if (!groups) throw `Schedule string couldn't be parsed: '${str}'`;
		return {
			day: groups[1],
			shift: groups[2],
			firstHour: groups[3],
			lastHour: groups[4],
		};
	};

	/**
	 * Old (or at least legacy) version of the schedules, represented in the form of:
	 * "Lu(m)0:6 Ma(t)1:5"
	 * @param str
	 * @returns {{shift: string, firstHour: string, lastHour: string, day: string}[]}
	 */
	let getSchedulesFromString = function (str) {
		if (!str) return [];
		try {
			return str.split(" ").filter(el => !!el).map(getScheduleFromString);
		} catch (e) {
			// Log the entire string if it couldn't be parsed:
			throw `Schedules string couldn't be parsed: '${str}' because of: ${e}`;
		}
	};

	/**
	 * New (or different) version of the schedules, represented in the form of:
	 * [
	 * 		{dia_semana: "Lunes", hora_catedra_inicio: "16", hora_catedra_fin: "19"},
	 * 		{dia_semana: "Jueves", hora_catedra_inicio: "16", hora_catedra_fin: "19"}
	 * ]
	 * @param arr
	 * @returns {{shift: string, firstHour: string, lastHour: string, day: string}[]}
	 */
	let getSchedulesFromArray = function (arr) {
		return arr.map(schedule => {
			// TODO: Not performant but not important right now (to be improved/unify schedules parsing.)
			let day = Object.entries(DAYS).filter(entry => entry[1] === schedule.dia_semana).map(entry => entry[0])[0];
			if (!day) throw `Couldn't parse day: ${day}`;

			let shiftIdx = Math.floor((parseInt(schedule.hora_catedra_inicio) - 1) / 7); // 0:m, 1:t, 2:n
			let shift = Object.keys(HOURS)[shiftIdx];
			let firstHour = (parseInt(schedule.hora_catedra_inicio) - 1) % 7;
			let lastHour = (parseInt(schedule.hora_catedra_fin) - 1) % 7;
			return {
				day: day,
				shift: shift,
				firstHour: firstHour,
				lastHour: lastHour,
			};
		});
	};

	let getTimeInfoStringFromSchedules = function (schedules) {
		if (!schedules) return "-";
		return schedules
			.map(schedule => DAYS[schedule.day] + " (" + TIME_SHIFTS[schedule.shift] + ") " + HOURS[schedule.shift][schedule.firstHour].start + "hs a " + HOURS[schedule.shift][schedule.lastHour].end + "hs")
			.join(" y ");
	};

	let trimCourseName = function (name) {
		name = name.trim();
		if (name.length > 20) {
			return name.substr(0, 20) + "...";
		} else {
			return name;
		}
	};

	// Parses a date with format DD/MM/YYYY
	let parseDate = function (dateStr) {
		let dateParts = dateStr.split("/");
		return new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
	};

	let getColorForAvg = function (avg) {
		if (avg < 60) {
			return "#D51C26";
		} else if (avg >= 80) {
			return "#19B135";
		} else {
			return "#F4D224";
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
			<a class="no-ajax" href="${CustomPages.getProfessorSurveyResultsUrl(professor.name)}" target="_blank">${professor.name}</a> (${professor.role})
		</li>`;
	};

	// Public
	return {
		injectScript: injectScript,
		attachEvent: attachEvent,
		stringifyError: stringifyError,
		wrapError: wrapError,
		wrapEventFunction: wrapEventFunction,

		//--

		HOURS: HOURS,
		DAYS: DAYS,
		TIME_SHIFTS: TIME_SHIFTS,
		BRANCHES: BRANCHES,

		getWeightedGrade: getWeightedGrade,

		getSchedulesFromString: getSchedulesFromString,
		getSchedulesFromArray: getSchedulesFromArray,
		getTimeInfoStringFromSchedules: getTimeInfoStringFromSchedules,

		trimCourseName: trimCourseName,
		parseDate: parseDate,

		getColorForAvg: getColorForAvg,
		getOverallScoreSpan: getOverallScoreSpan,
		getProfessorLi: getProfessorLi,
	};
};
