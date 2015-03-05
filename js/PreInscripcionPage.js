var PreInscripcionPage = function(utils) {

	var getAllHoursUsed = function($table) {
		var getTurnIndex = function(turn) {
			if (turn == "m") {
				return 0;
			} else if (turn == "t") {
				return 1;
			} else if (turn == "n") {
				return 2;
			}
			return 0;
		};

		var hoursUsed = {};

		$table.find("tbody tr").each(function(){
			var $td = $(this).find("td:eq(1):not(.soft-back)");
			if ($td.length) {
				var code = $(this).find("td:first").text().match(/\[(.*?)\]/)[1];

				// TODO this. (get all hours)
				var str = $td.text().replace("CAMPUS", "").replace("MEDRANO", "");

				$.each(str.split(" "), function() {
					var schedule = utils.parseScheduleString(this);

					if (schedule) {
						var firstHour = parseInt(schedule.firstHour) + (getTurnIndex(schedule.turn) * 7);
						var lastHour = parseInt(schedule.lastHour) + (getTurnIndex(schedule.turn) * 7);

						if (!hoursUsed[schedule.day]) {
							hoursUsed[schedule.day] = {};
						}

						for (var i = firstHour; i<= lastHour; i++) {
							hoursUsed[schedule.day][i] = code;
						}
					}
				});
				
			}
		});

		return hoursUsed;
	};

	var setTable = function(hoursUsed) {
		var $table = $("<table>");
		var $tbody = $("<tbody>");

		$table.append($tbody);
		$tbody.append('<tr><th></th><th colspan="7">Mañana</th><th colspan="7">Tarde</th><th colspan="7">Noche</th></tr>');

		for (var day in utils.days) {
			var $tr = $("<tr>");
			$tr.append($("<td>", { html: utils.days[day] }));

			for (var i = 0; i <= 19; i++) {
				var code = hoursUsed[day] ? hoursUsed[day][i] : "";
				if (code) {
					code = "#" + code.split("").reverse().join("");
				} else {
					code ="transparent";
				}
				$tr.append($("<td>", { style: "background-color:" + code, html: "&nbsp;" }));
			}
			$tbody.append($tr);
		}

		var $p = $("<p>", { html: "Preview de cursada" });
		$(".std-canvas table:last").parent().after($p);
		$p.after($table);
	};

	(function() {
		if ($(".std-canvas table").length > 2) {
			var hoursUsed = getAllHoursUsed($(".std-canvas table:last"));
			setTable(hoursUsed);
		}
	})();


	// Public
	return {};
};