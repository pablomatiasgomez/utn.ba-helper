var PreInscripcionPopUpPage = function(utils) {

	var $table = $();

	var getHtmlFilters = function() {
		var getSelect = function(clazz, map) {
			var $select = $("<select class='" + clazz + "'></select>");
			$select.append("<option value=''>- Sin filtro -</option>");
			for (var key in map) {
				$select.append("<option value='" + key + "'>" + map[key] + "</option>");
			}
			return $select;
		};

		var $divFilters = $("<div class='filters'><div class='bold'>Filtros:</div></div>");

		$divFilters.append("<span>Turno: </span>");
		$divFilters.append(getSelect("turns", utils.turns));

		$divFilters.append("<span>Dia: </span>");
		$divFilters.append(getSelect("days", utils.days));

		$divFilters.append("<span>Sede: </span>");
		$divFilters.append(getSelect("sedes", utils.sedes));

		return $divFilters;
	};

	var bindFilterEvents = function($divFilters) {
		var onFilterChange = function() {
			var filters = ["turns", "days", "sedes"];
			var filterValues = {};
			filters.forEach(function(filter) {
				filterValues[filter] = $divFilters.find("select." + filter).val();
			});

			$table.find("tr").show().each(function() {
				for (var filter in filterValues) {
					if (filterValues[filter] && $(this).attr(filter).indexOf(filterValues[filter]) == -1) {
						$(this).hide();
					}
				}
			});
		};
		$divFilters.find("select").on("change", onFilterChange);
	};

	var addTimeInfo = function($tr) {
		var $td = $tr.find("td:eq(2)");
		var schedules = utils.getSchedulesFromString($td.text());

		$tr.attr("days", schedules.map(function(schedule) { return schedule.day; }).join(","));
		$tr.attr("turns", schedules.map(function(schedule) { return schedule.turn; }).join(","));
		$tr.attr("sedes", $tr.find("td:eq(3)").text());

		$td.html($td.text() + "<br /><b>" + utils.getTimeInfoStringFromSchedules(schedules) + "</b>");
	};

	// Init
	(function() {
		$table = $(".std-canvas table");
		$table.find("tbody tr").each(function(){
			addTimeInfo($(this));
		});

		var $divFilters = getHtmlFilters();
		$table.parent().before($divFilters);
		bindFilterEvents($divFilters);
	})();


	// Public
	return {};
};