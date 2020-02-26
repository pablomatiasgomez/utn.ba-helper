let PreInscripcionPopUpPage = function (utils, apiConnector) {

	let year = new Date().getFullYear(); // We know that registering happens in the same year calendar. (March and July)
	let quarters = (new Date().getMonth() + 1) < 5 ? ["A", "1C"] : ["2C"];
	let courseCode;

	let $table = $();

	let setCourseCode = function () {
		courseCode = $(".std-canvas .tab > p > span > span").text().trim();
	};

	/**
	 * Adds the filter combos, and binds them so that they filter rows when the selection changes.
	 */
	let addFilters = function () {
		let createCombo = function (clazz, map) {
			let $select = $("<select class='" + clazz + "'></select>");
			$select.append("<option value=''>- Sin filtro -</option>");
			Object.entries(map).forEach(entry => $select.append("<option value='" + entry[0] + "'>" + entry[1] + "</option>"));
			return $select;
		};
		let $divFilters = $("<div style='margin-bottom: 10px;'><div class='bold'>Filtros:</div></div>");
		$divFilters.append("<span>Turno: </span>");
		$divFilters.append(createCombo("time-shifts", utils.TIME_SHIFTS));
		$divFilters.append("<span>Dia: </span>");
		$divFilters.append(createCombo("days", utils.DAYS));
		$divFilters.append("<span>Sede: </span>");
		$divFilters.append(createCombo("branches", utils.BRANCHES));

		$divFilters.find("select").on("change", function () {
			let filterValues = {};
			["time-shifts", "days", "branches"].forEach(filter => filterValues[filter] = $divFilters.find("select." + filter).val());
			$table.find("tr:not(:first)").show().each(function () {
				for (let filter in filterValues) {
					if (filterValues[filter] && $(this).attr(filter).indexOf(filterValues[filter]) === -1) {
						$(this).hide();
					}
				}
			});
		});
		$table.parent().before($divFilters);
	};

	/**
	 * Adds:
	 * - the attributes used to filter them.
	 * - the schedule detail.
	 * - the column with the previous professor information.
	 * @return the promise that handles the add of the previous professors.
	 */
	let addTimeInfoToRowsAndRequestForPreviousProfessors = function () {
		let previousProfessorsRequest = {
			year: year,
			quarters: quarters,
			courseCode: courseCode,
			futureClassSchedules: {} // Map from classCode to branchWithSchedule
		};
		let $previousProfessorsTdByClassCode = {};
		$table.find("tbody tr").each(function () {
			let $tr = $(this);
			let $schedulesTd = $tr.find("td:eq(2)");

			let classCode = $tr.find("td:eq(1)").text().trim();
			let branch = $tr.find("td:eq(3)").text().trim().toUpperCase().replace(" ", "_");
			let schedules = utils.getSchedulesFromString($schedulesTd.text().trim());

			$tr.attr("days", schedules.map(schedule => schedule.day).join(","));
			$tr.attr("time-shifts", schedules.map(schedule => schedule.shift).join(","));
			$tr.attr("branches", branch);
			$schedulesTd.append("<br><b>" + utils.getTimeInfoStringFromSchedules(schedules) + "</b>");

			// Handle previous professors request and cell:
			if (previousProfessorsRequest.futureClassSchedules[classCode]) throw "Multiple classes in course " + courseCode + " were found with the same code: " + classCode;
			previousProfessorsRequest.futureClassSchedules[classCode] = {
				branch: branch,
				schedules: schedules
			};
			$previousProfessorsTdByClassCode[classCode] = $(`<td></td>`);
			$tr.append($previousProfessorsTdByClassCode[classCode]);
		});

		$table.find("tbody").prepend(`<tr><th></th><th>Curso</th><th>Horario</th><th>Anexo</th><th>Profesores en años anteriores <span title="En base a datos colectados por el SigaHelper, se intenta poder saber que profesor va a estar en cada cursada, basandonos en los profesores que estuvieron en cursadas anteriores. El matching se hace por horario y anexo, a menos que no este esa informacion, y entonces se hace por por codigo de curso, pero en esos casos no se puede asegurar que sea tan correcto dado que cambian seguido (Un mismo codigo de curso, en años distintos, puede estar en distintos horarios y por ende con distintos profesores).">[?]</span></th></tr>`);

		// Returns a map from classCode (the one we sent) -> year -> classCode (the new one) -> List of professors
		return apiConnector.getPreviousProfessors(previousProfessorsRequest).then(response => {
			Object.entries(response).forEach(previousProfessorsByClassCode => {
				let ownClassCode = previousProfessorsByClassCode[0];
				let $td = $previousProfessorsTdByClassCode[ownClassCode];
				let content = "";
				content += `<ul class="no-margin">`;
				Object.entries(previousProfessorsByClassCode[1])
					.sort((a, b) => (a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0))
					.forEach(classesByYear => {
						let year = classesByYear[0];
						content += `<li>${year}<ul class="no-margin">`;
						Object.entries(classesByYear[1])
							.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
							.forEach(professorsByClass => {
								let newClassCode = professorsByClass[0];
								content += `<li>${newClassCode}<ul class="no-margin">`;
								professorsByClass[1].forEach(professor => {
									content += utils.getProfessorLi(professor);
								});
								content += `</ul></li>`;
							});
						content += `</ul></li>`;
					});
				content += `</ul>`;
				$td.html(content);
			});
		});
	};

	let addPoweredBy = function () {
		$table.parent().css("display", "inline-block").append("<span class='powered-by-siga-helper'></span>");
	};

	let resizeWindow = function () {
		try {
			// Make it wider so that professorNames fit in the screen. Also catch any error as we don't know if browsers support this or not.
			window.resizeTo(1280, 800);
		} catch (e) {
			return apiConnector.logMessage("resizeWindow", true, utils.stringifyError(e));
		}
	};

	return Promise.resolve().then(() => {
		$table = $(".std-canvas table");
		resizeWindow();
		setCourseCode();
		addFilters();
		addPoweredBy();
		return addTimeInfoToRowsAndRequestForPreviousProfessors();
	});
};
