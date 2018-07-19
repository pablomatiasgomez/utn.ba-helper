var HorariosPage = function(utils) {

	var rgb2hex = function(rgb) {
		if (/^#[0-9A-F]{6}$/i.test(rgb)) return rgb;

		rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
		if (!rgb) return rgb;

		function hex(x) {
			return ("0" + parseInt(x).toString(16)).slice(-2);
		}
		return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
	};

	var getSubjectsByColor = function() {
		var subjectsByColor = {};

		$(".std-canvas table:first tr:not(:first)").each(function() {
			var name = $(this).find("td:nth(2)").text().trim();
			var color = $(this).find("td[style]:last").css("background-color");
			if (!name || !color) return;
			subjectsByColor[rgb2hex(color)] = name;
		});

		return subjectsByColor;
	};
	
	var setSubjectsNameInTable = function() {
		var subjectsByColor = getSubjectsByColor();
		var last = null;

		$(".std-canvas table:last tr:not(:first) td").each(function() {
			var color = rgb2hex($(this).css("background-color"));
			if (color && last != color && subjectsByColor[color]) {
				$(this).text(utils.cutSubjectName(subjectsByColor[color]));
				$(this).addClass("name-container");
			}
			last = color;
		});
	};

	var addTimeInfo = function($tr) {
		$(".std-canvas table:first tr:not(:first)").each(function() {
			var $td = $(this).find("td:nth(5)");
			var schedules = utils.getSchedulesFromString($td.text());
			$td.html($td.text() + "<br /><b>" + utils.getTimeInfoStringFromSchedules(schedules) + "</b>");
		});
	};

	var addPoweredBy = function() {
		$(".std-canvas table").parent().css("display", "inline-block").append("<span class='powered-by-siga-helper'></span>");
	};

	// Init
	(function() {
		addTimeInfo();
		setSubjectsNameInTable();
		addPoweredBy();
	})();
	

	// Public
	return {};
};