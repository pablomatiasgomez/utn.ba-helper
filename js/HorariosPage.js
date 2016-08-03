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

	var getMateriasByColor = function() {
		var materiasByColor = {};

		$(".std-canvas table:first tr:not(:first)").each(function() {
			var name = $(this).find("td:nth(2)").text();
			var color = rgb2hex($(this).find("td:nth(8)").css("background-color"));
			materiasByColor[color] = name;
		});

		return materiasByColor;
	};
	
	var setMateriasNameInTable = function() {
		var getMateriaName = function(name) {
			if (name.length > 20) {
				return name.substr(0, 20) + "...";
			} else {
				return name;
			}
		};

		var materiasByColor = getMateriasByColor();
		var last = null;

		$(".std-canvas table:last tr:not(:first) td").each(function() {
			var color = rgb2hex($(this).css("background-color"));
			if (color && last != color && materiasByColor[color]) {
				$(this).text(getMateriaName(materiasByColor[color]));
				$(this).css({
					"max-width": "0",
					"white-space": "nowrap",
					"font-size": "13px",
    				"padding": "5px"
				});
			}
			last = color;
		});
	};

	var addTimeInfo = function($tr) {
		$(".std-canvas table:first tr:not(:first)").each(function() {
			var $td = $(this).find("td:nth(7)")
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
		setMateriasNameInTable();
		addPoweredBy();
	})();
	

	// Public
	return {};
};