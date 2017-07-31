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
			var $tdAlternates = $(this).find("td:not(:first)");
			
			if ($tdAlternates.length) {
				var tdSubject = $(this).find("td:first").text();
				var subject = {
					code: tdSubject.match(/\[(.*?)\]/)[1],
					name: tdSubject.split(" ").slice(1).join(" ")
				};

				$tdAlternates.each(function(alternateIndex) {
					if (!$(this).hasClass("soft-back")) {
						var strArray = utils.getTextNodes($(this));
						if (!strArray.length) {
							strArray = utils.getTextNodes($(this).find("a"));
						}

						if (strArray.length) {
							var str = strArray[0].replace("CAMPUS", "").replace("MEDRANO", ""); // This is not necessary, but just in case.

							utils.getSchedulesFromString(str).forEach(function(schedule) {
								var firstHour = parseInt(schedule.firstHour) + (getTurnIndex(schedule.turn) * 7);
								var lastHour = parseInt(schedule.lastHour) + (getTurnIndex(schedule.turn) * 7);

								if (!hoursUsed[alternateIndex]) {
									hoursUsed[alternateIndex] = {};
								}

								if (!hoursUsed[alternateIndex][schedule.day]) {
									hoursUsed[alternateIndex][schedule.day] = {};
								}

								for (var i = firstHour; i <= lastHour; i++) {
									hoursUsed[alternateIndex][schedule.day][i] = subject;
								}
							});
						}
					}
				});
			}
		});

		return hoursUsed;
	};

	var getRandomRGBBySubjectCode = function(subjectCode) {
		var arr = ((parseInt(subjectCode.toString().replace(/0/g, "2")) * 31)).toString().slice(-6);
		var r = parseInt(arr.slice(0, 2) / 100 * 255);
		var g = parseInt(arr.slice(2, 4) / 100 * 255);
		var b = parseInt(arr.slice(4, 6) / 100 * 255);

		while (((0.2126*r) + (0.7152*g) + (0.0722*b))  < 128) {
			r = parseInt(Math.min(255, r * 1.1));
			g = parseInt(Math.min(255, g * 1.1));
			b = parseInt(Math.min(255, b * 1.1));
		}
		return "#" + r.toString(16) + g.toString(16) + b.toString(16);
	};

	var setPreviewTable = function(hoursUsed) {
		var $divContainer = $("<div style='display: inline-block;'>");

		for (var alternateIndex in hoursUsed) {
			var $table = $("<table>");
			var $tbody = $("<tbody>");

			$table.append($tbody);
			$tbody.append('<tr><th></th><th colspan="7">Mañana</th><th colspan="7">Tarde</th><th colspan="7">Noche</th></tr>');


			for (var day in utils.DAYS) {
				var $tr = $("<tr>");
				$tr.append($("<td>", { html: utils.DAYS[day] }));

				var lastColor = null;
				for (var i = 0; i <= 19; i++) {
					var subject = hoursUsed[alternateIndex][day] ? hoursUsed[alternateIndex][day][i] : null;

					var color = "transparent";
					var text = "&nbsp;";
					if (subject) {
						color = getRandomRGBBySubjectCode(subject.code);
						if (lastColor != color) text = utils.cutSubjectName(subject.name);
					}
					lastColor = color;

					$tr.append($("<td>", { class: "name-container", style: "background-color:" + color, html: text }));
				}
				$tbody.append($tr);
			}

			var $p = $("<p>", { html: "Preview de cursada (Alt " + (parseInt(alternateIndex) + 1) + ")" });
			var $divTable = $("<div>").append($table);
			$divContainer.append($p);
			$divContainer.append($divTable);
			$divContainer.append("<span class='powered-by-siga-helper'></span>");
		}
		$(".std-canvas table:last").parent().after($divContainer);
	};

	(function() {
		var $table = $(".std-canvas table:last");
		var $th = $table.find("tr:first > th:first");

		// Check used to be sure that the given table is the one that has the used hours
		if ($th.length && $th.text() === "") {
			var hoursUsed = getAllHoursUsed($table);
			setPreviewTable(hoursUsed);
		}
	})();


	// Public
	return {};
};