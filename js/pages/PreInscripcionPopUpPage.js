let PreInscripcionPopUpPage = function (utils) {

	let $table = $();

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
		let $divFilters = $("<div class='filters'><div class='bold'>Filtros:</div></div>");
		$divFilters.append("<span>Turno: </span>");
		$divFilters.append(createCombo("time-shifts", utils.TIME_SHIFTS));
		$divFilters.append("<span>Dia: </span>");
		$divFilters.append(createCombo("days", utils.DAYS));
		$divFilters.append("<span>Sede: </span>");
		$divFilters.append(createCombo("branches", utils.BRANCHES));

		$divFilters.find("select").on("change", function () {
			let filterValues = {};
			["time-shifts", "days", "branches"].forEach(filter => filterValues[filter] = $divFilters.find("select." + filter).val());
			$table.find("tr").show().each(function () {
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
	 */
	let addTimeInfoToRows = function () {
		$table.find("tbody tr").each(function () {
			let $tr = $(this);
			let $schedulesTd = $tr.find("td:eq(2)");
			let schedules = utils.getSchedulesFromString($schedulesTd.text());

			$tr.attr("days", schedules.map(schedule => schedule.day).join(","));
			$tr.attr("time-shifts", schedules.map(schedule => schedule.shift).join(","));
			$tr.attr("branches", $tr.find("td:eq(3)").text().trim().toUpperCase().replace(" ", "_"));
			$schedulesTd.append("<br><b>" + utils.getTimeInfoStringFromSchedules(schedules) + "</b>");
			$tr.append(`<td><a href='#' class="search-previous-professors">Ver profesores de años anteriores...</a></td>`);
		});
	};

	let bindSearchPreviousProfessors = function () {
		$table.find("search-previous-professors").on("click", function () {
			let $tr = $(this).closest("tr");

			let year = parseInt("2020"); // TODO
			let quarter = "1C"; // TODO
			let classCode = $tr.find("td:eq(1)").text().trim(); // TODO
			let courseCode = $tr.find("td:eq(0)").text().trim(); // TODO
			let branch = $tr.find("td:eq(3)").text().trim().toUpperCase().replace(" ", "_");
			let schedules = utils.getSchedulesFromString($tr.find("td:eq(2)").text());

			return apiConnector.getPreviousProfessors({
				year: year,
				quarter: quarter,
				classCode: classCode,
				courseCode: courseCode,
				branch: branch,
				schedules: schedules
			}).then(previousProfessors => {
				Object.entries(previousProfessors).forEach(classesByYear => {
					let year = classesByYear[0];
					Object.entries(classesByYear[1]).forEach(professorsByClass => {
						let classCode = professorsByClass[0];
						professorsByClass[1].forEach(professor => {
							let professorName = professor.professorName;
							let professorRole = professor.professorRole;
							let overallScore = professor.overallScore;
							// TODO use this data.
							console.log(year, classCode, professorName, professorRole);
							let getProfessorSurveyResultsUrl = function (professorName) {
								return `/?professorName=${encodeURIComponent(professorName)}#${encodeURIComponent("Encuesta Docente")}`;
							};
							window.open(getProfessorSurveyResultsUrl(professorName), '_blank');
						});
					});
				});
			});
		});
	};

	// Init
	(function () {
		$table = $(".std-canvas table");
		addTimeInfoToRows();
		addFilters();
		bindSearchPreviousProfessors();
	})();

	// Public
	return {};
};
