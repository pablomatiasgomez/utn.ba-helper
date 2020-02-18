let PreInscripcionPopUpPage = function (utils) {

	let $table = $();

	let getHtmlFilters = function () {
		let getSelect = function (clazz, map) {
			let $select = $("<select class='" + clazz + "'></select>");
			$select.append("<option value=''>- Sin filtro -</option>");
			Object.entries(map).forEach(entry => $select.append("<option value='" + entry[0] + "'>" + entry[1] + "</option>"));
			return $select;
		};

		let $divFilters = $("<div class='filters'><div class='bold'>Filtros:</div></div>");

		$divFilters.append("<span>Turno: </span>");
		$divFilters.append(getSelect("time-shifts", utils.TIME_SHIFTS));

		$divFilters.append("<span>Dia: </span>");
		$divFilters.append(getSelect("days", utils.DAYS));

		$divFilters.append("<span>Sede: </span>");
		$divFilters.append(getSelect("branches", utils.BRANCHES));

		return $divFilters;
	};

	let bindFilterEvents = function ($divFilters) {
		let onFilterChange = function () {
			let filters = ["time-shifts", "days", "branches"];
			let filterValues = {};
			filters.forEach(function (filter) {
				filterValues[filter] = $divFilters.find("select." + filter).val();
			});

			$table.find("tr").show().each(function () {
				for (let filter in filterValues) {
					if (filterValues[filter] && $(this).attr(filter).indexOf(filterValues[filter]) === -1) {
						$(this).hide();
					}
				}
			});
		};
		$divFilters.find("select").on("change", onFilterChange);
	};

	let addTimeInfo = function ($tr) {
		let $td = $tr.find("td:eq(2)");
		let schedules = utils.getSchedulesFromString($td.text().trim());

		$tr.attr("days", schedules.map(function (schedule) {
			return schedule.day;
		}).join(","));
		$tr.attr("time-shifts", schedules.map(function (schedule) {
			return schedule.shift;
		}).join(","));
		$tr.attr("branches", $tr.find("td:eq(3)").text());

		$td.html($td.text() + "<br /><b>" + utils.getTimeInfoStringFromSchedules(schedules) + "</b>");
	};

	// Init
	(function () {
		$table = $(".std-canvas table");
		$table.find("tbody tr").each(function () {
			addTimeInfo($(this));
		});

		let $divFilters = getHtmlFilters();
		$table.parent().before($divFilters);
		bindFilterEvents($divFilters);
	})();


	// Public
	return {};
};
