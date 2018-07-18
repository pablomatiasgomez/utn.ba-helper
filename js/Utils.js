var Utils = function(pagesDataParser) {

	var HOURS = {
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
	var DAYS = {
		Lu: "Lunes",
		Ma: "Martes",
		Mi: "Miercoles",
		Ju: "Jueves",
		Vi: "Viernes",
		Sa: "Sabado"
	};
	var TIME_SHIFTS = {
		m: "Mañana",
		t: "Tarde",
		n: "Noche"
	};
	var BRANCHES = {
		CAMPUS: "CAMPUS",
		MEDRANO: "MEDRANO"
	};
	var NEW_NOTES_REGULATION_DATE = new Date(2017, 2, 10); // Doesn't have to be exact.. just using March 10th.

	var getScheduleFromString = function(str) {
		if (str.indexOf("(") == -1 || str.indexOf(":") == -1) return;

		return {
			day: str.split("(")[0].replace("á", "a"),
			turn: str.match(/\(([^)]+)\)/)[1],
			firstHour: str.split(")")[1].split(":")[0],
			lastHour: str.split(")")[1].split(":")[1],
		};
	};

	var getSchedulesFromString = function(str) {
		if (!str) return [];

		return str.split(" ").map(getScheduleFromString).filter(function(el) { return !!el; });
	};

	var getTimeInfoStringFromSchedules = function(schedules) {
		var getStringForSchedule = function(schedule) {
			return DAYS[schedule.day] + " (" + TIME_SHIFTS[schedule.turn] + ") " + HOURS[schedule.turn][schedule.firstHour].start + "hs a " + HOURS[schedule.turn][schedule.lastHour].end + "hs";
		};

		return schedules.map(getStringForSchedule).join(" y ");
	};

	var getTextNodes = function($item) {
		var arr = $item.contents().filter(function() {
			return this.nodeType !== 1;
		});
		var strArr = [];
		$(arr).each(function() {
			strArr.push($(this).text());
		});
		return strArr;
	};

	var cutSubjectName = function(name) {
		name = name.trim();
		if (name.length > 20) {
			return name.substr(0, 20) + "...";
		} else {
			return name;
		}
	};

	// Parses a date with format DD/MM/YYYY
	var parseDate = function(dateStr) {
		var dateParts = dateStr.split("/");
		return new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
	};

	// Public
	return {
		HOURS: HOURS,
		DAYS: DAYS,
		TIME_SHIFTS: TIME_SHIFTS,
		BRANCHES: BRANCHES,
		NEW_NOTES_REGULATION_DATE: NEW_NOTES_REGULATION_DATE,

		getSchedulesFromString: getSchedulesFromString,
		getTimeInfoStringFromSchedules: getTimeInfoStringFromSchedules,

		getTextNodes: getTextNodes,
		
		cutSubjectName: cutSubjectName,
		parseDate: parseDate
	};
};