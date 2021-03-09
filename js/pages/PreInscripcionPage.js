let PreInscripcionPage = function (pagesDataParser, utils) {

	/**
	 * Combines both {@link getAllCurrentClasses} and {@link getAllSelectedCoursesInAlternatives}
	 * and returns a single map with all the used hours
	 * @return an object from: alternativeIndex -> scheduleDay -> hour (from 0 to 19 to consier all shifts) -> selectedCourse
	 */
	let getAllUsedHours = function ($alternativesTable) {
		let usedHours = getAllSelectedCoursesInAlternatives($alternativesTable);
		return getAllCurrentClasses().then(currentClasses => {
			// We will add this for every alternative that has a value:
			currentClasses.forEach(classSchedule => {
				Object.keys(usedHours).forEach(alternativeIndex => {
					addCourseToUsedHours(usedHours, alternativeIndex, classSchedule.courseCode, classSchedule.courseName, classSchedule.schedules);
				});
			});
			return usedHours;
		});
	};

	/**
	 * Gets all the current classes that the student is having in order to merge them with the alternatives, and show them in one single table.
	 * @return a list of the current classes.
	 */
	let getAllCurrentClasses = function () {
		// Current (old) quarter classes are returned too, so we will only include annual classes.
		return pagesDataParser.getClassSchedules().then(currentClasses => {
			return currentClasses.filter(classSchedule => classSchedule.quarter === "A");
		});
	};

	/**
	 * Gets and returns all the used hours in all the alternative that the stundent is registering
	 * @return an object from: alternativeIndex -> scheduleDay -> hour (from 0 to 19 to consier all shifts) -> selectedCourse
	 */
	let getAllSelectedCoursesInAlternatives = function ($table) {
		let usedHours = {};

		$table.find("tbody tr").each(function () {
			let $tdAlternatives = $(this).find("td:not(:first)");

			// Filter out rows that do not correspond to a course (i.e. header and add new courses rows)
			if (!$tdAlternatives.length) return;

			// Now given that this row contains alternatives for a course, we first figure out what course is:
			let courseStr = $(this).find("td:first").text().trim();
			let groups = /^\[(\d{6})\] (.*)$/.exec(courseStr);
			if (!groups) throw `courseStr couldn't be parsed: '${courseStr}'`;
			let courseCode = groups[1];
			let courseName = groups[2].trim();

			$tdAlternatives.each(function (alternativeIndex) {
				// Filter out the alternatives that are not yet filled:
				if ($(this).hasClass("soft-back")) return;

				let strArray = utils.getTextNodes($(this));
				if (!strArray.length) {
					strArray = utils.getTextNodes($(this).find("a"));
				}
				if (!strArray.length) return;

				// This is always needed, because we are grabbing the first text node, but in some cases like AULA VIRTUAL it can happen that it is needed.
				let schedulesStr = strArray[0].trim().replace("CAMPUS", "").replace("MEDRANO", "").replace("AULA VIRTUAL", "");
				addCourseToUsedHours(usedHours, alternativeIndex, courseCode, courseName, utils.getSchedulesFromString(schedulesStr));
			});
		});

		return usedHours;
	};

	let getShiftIndex = function (shift) {
		if (shift === "m") {
			return 0;
		} else if (shift === "t") {
			return 1;
		} else if (shift === "n") {
			return 2;
		}
		return 0;
	};

	let addCourseToUsedHours = function (usedHours, alternativeIndex, courseCode, courseName, schedules) {
		let selectedCourse = {
			courseCode: courseCode,
			courseName: courseName
		};
		schedules.forEach(schedule => {
			let firstHour = parseInt(schedule.firstHour) + (getShiftIndex(schedule.shift) * 7);
			let lastHour = parseInt(schedule.lastHour) + (getShiftIndex(schedule.shift) * 7);

			if (!usedHours[alternativeIndex]) {
				usedHours[alternativeIndex] = {};
			}
			if (!usedHours[alternativeIndex][schedule.day]) {
				usedHours[alternativeIndex][schedule.day] = {};
			}
			for (let hour = firstHour; hour <= lastHour; hour++) {
				usedHours[alternativeIndex][schedule.day][hour] = selectedCourse;
			}
		});
	};

	let getRandomRGBByCode = function (code) {
		let arr = ((parseInt(code.toString().replace(/0/g, "2")) * 31)).toString().slice(-6);
		let r = Math.floor(arr.slice(0, 2) / 100 * 255);
		let g = Math.floor(arr.slice(2, 4) / 100 * 255);
		let b = Math.floor(arr.slice(4, 6) / 100 * 255);

		while (((0.2126 * r) + (0.7152 * g) + (0.0722 * b)) < 128) {
			r = Math.ceil(Math.min(255, r * 1.1));
			g = Math.ceil(Math.min(255, g * 1.1));
			b = Math.ceil(Math.min(255, b * 1.1));
		}
		let color = "#";
                color += (r < 16) ? "0" + r.toString(16) : r.toString(16);
                color += (g < 16) ? "0" + g.toString(16) : g.toString(16);
                color += (b < 16) ? "0" + b.toString(16) : b.toString(16);
		return color;
	};

	let setPreviewTable = function (usedHours) {
		let $divContainer = $("<div style='display: inline-block;'>");

		Object.keys(usedHours).forEach(alternativeIndex => {
			let $table = $("<table>");
			let $tbody = $("<tbody>");

			$table.append($tbody);
			$tbody.append('<tr><th></th><th colspan="7">Mañana</th><th colspan="7">Tarde</th><th colspan="7">Noche</th></tr>');

			for (let day in utils.DAYS) {
				let $tr = $("<tr>");
				$tr.append($("<td>", {html: utils.DAYS[day]}));

				let lastColor = "";
				for (let i = 0; i <= 19; i++) {
					let selectedCourse = usedHours[alternativeIndex][day] ? usedHours[alternativeIndex][day][i] : null;

					let color = "transparent";
					let text = "&nbsp;";
					if (selectedCourse) {
						color = getRandomRGBByCode(selectedCourse.courseCode);
						if (lastColor !== color) text = utils.trimCourseName(selectedCourse.courseName);
					}
					lastColor = color;

					$tr.append($("<td>", {class: "name-container", style: "background-color:" + color, html: text}));
				}
				$tbody.append($tr);
			}

			let $p = $("<p>", {html: "Preview de cursada (Alt " + (parseInt(alternativeIndex) + 1) + ")"});
			let $divTable = $("<div>").append($table);
			$divContainer.append($p);
			$divContainer.append($divTable);
			$divContainer.append("<span class='powered-by-siga-helper'></span>");
		});
		$(".std-canvas table:last").parent().after($divContainer);
	};

	// Init
	return Promise.resolve().then(() => {
		let $alternativesTable = $(".std-canvas table:last");
		let $th = $alternativesTable.find("tr:first > th:first");

		// Check used to be sure that the given table is the one that has the used hours.
		// This is because this page is loaded without this table too.
		if ($th.length && $th.text() === "") {
			return getAllUsedHours($alternativesTable).then(usedHours => {
				setPreviewTable(usedHours);
			});
		}
	});
};
