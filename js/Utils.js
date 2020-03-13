let Utils = function () {

	const HOURS = {
		m: {
			0: {
				start: "7:45",
				end: "8:30"
			},
			1: {
				start: "8:30",
				end: "9:15"
			},
			2: {
				start: "9:15",
				end: "10:00"
			},
			3: {
				start: "10:15",
				end: "11:00"
			},
			4: {
				start: "11:00",
				end: "11:45"
			},
			5: {
				start: "11:45",
				end: "12:30"
			},
			6: {
				start: "12:30",
				end: "13:15"
			}
		},
		t: {
			0: {
				start: "13:30",
				end: "14:15"
			},
			1: {
				start: "14:15",
				end: "15:00"
			},
			2: {
				start: "15:00",
				end: "15:45"
			},
			3: {
				start: "16:00",
				end: "16:45"
			},
			4: {
				start: "16:45",
				end: "17:30"
			},
			5: {
				start: "17:30",
				end: "18:15"
			},
			6: {
				start: "18:15",
				end: "19:00"
			},
		},
		n: {
			0: {
				start: "18:15",
				end: "19:00"
			},
			1: {
				start: "19:00",
				end: "19:45"
			},
			2: {
				start: "19:45",
				end: "20:30"
			},
			3: {
				start: "20:45",
				end: "21:30"
			},
			4: {
				start: "21:30",
				end: "22:15"
			},
			5: {
				start: "22:15",
				end: "23:00"
			},
			6: {
				start: "6", //Should never go through here.
				end: "6"
			}
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
		CAMPUS: "CAMPUS",
		MEDRANO: "MEDRANO",
		AULA_VIRTUAL: "AULA_VIRTUAL"
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

	let getScheduleFromString = function (str) {
		str = str.replace("á", "a"); // This is for day Sá
		let groups = /^(Lu|Ma|Mi|Ju|Vi|Sa)\(([mtn])\)([0-6]):([0-6])$/.exec(str.replace("á", "a"));
		if (!groups) throw `Schedule string couldn't be parsed: '${str}'`;
		return {
			day: groups[1],
			shift: groups[2],
			firstHour: groups[3],
			lastHour: groups[4],
		};
	};

	let getSchedulesFromString = function (str) {
		if (!str) return [];
		try {
			return str.split(" ").map(getScheduleFromString).filter(el => !!el);
		} catch (e) {
			// Log the entire string if it couldn't be parsed:
			throw `Schedules string couldn't be parsed: '${str}' because of: ${e}`;
		}
	};

	let getTimeInfoStringFromSchedules = function (schedules) {
		if (!schedules) return "-";
		return schedules
			.map(schedule => DAYS[schedule.day] + " (" + TIME_SHIFTS[schedule.shift] + ") " + HOURS[schedule.shift][schedule.firstHour].start + "hs a " + HOURS[schedule.shift][schedule.lastHour].end + "hs")
			.join(" y ");
	};

	let getTextNodes = function ($item) {
		let arr = $item.contents().filter(function () {
			return this.nodeType !== 1;
		});
		let strArr = [];
		$(arr).each(function () {
			strArr.push($(this).text());
		});
		return strArr;
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

	let stringifyError = function (error) {
		if (error instanceof Error) return error.toString() + "\n" + error.stack;
		if (typeof error === 'object') return JSON.stringify(error);
		return error;
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

	let getProfessorSurveyResultsUrl = function (professorName) {
		let params = {
			customPage: "Buscar docentes",
			professorName: professorName
		};
		return "/?" + Object.entries(params).map(entry => entry.map(encodeURIComponent).join("=")).join("&");
	};

	let getOverallScoreSpan = function(overallScore) {
		return `<span style="border: 1px solid grey; background-color: ${getColorForAvg(overallScore)}">${overallScore}</span>`;
	};

	let getProfessorLi = function (professor) {
		// If we do not have surveys we do not show the score nor the link.
		if (typeof professor.overallScore === "undefined") {
			return `<li>${professor.name}</li>`;
		}
		let fontSize = professor.kind === "DOCENTE" ? "15px" : "13px";
		return `<li style="font-size: ${fontSize}">
			${getOverallScoreSpan(professor.overallScore)}
			<a href="${getProfessorSurveyResultsUrl(professor.name)}" target="_blank">${professor.name}</a> (${professor.role})</a>
		</li>`;
	};

	// Public
	return {
		HOURS: HOURS,
		DAYS: DAYS,
		TIME_SHIFTS: TIME_SHIFTS,
		BRANCHES: BRANCHES,

		getWeightedGrade: getWeightedGrade,

		getSchedulesFromString: getSchedulesFromString,
		getTimeInfoStringFromSchedules: getTimeInfoStringFromSchedules,

		getTextNodes: getTextNodes,

		trimCourseName: trimCourseName,
		parseDate: parseDate,

		stringifyError: stringifyError,
		getColorForAvg: getColorForAvg,
		getOverallScoreSpan: getOverallScoreSpan,
		getProfessorLi: getProfessorLi,
	};
};
