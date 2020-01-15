let HorariosPage = function (utils) {

	let rgb2hex = function (rgb) {
		if (/^#[0-9A-F]{6}$/i.test(rgb)) return rgb;

		rgb = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
		if (!rgb) return rgb;

		const hex = x => ("0" + parseInt(x).toString(16)).slice(-2);
		return "#" + hex(rgb[1]) + hex(rgb[2]) + hex(rgb[3]);
	};

	let getClassesByColor = function () {
		let classesByColor = {};

		$(".std-canvas table:first tr:not(:first)").each(function () {
			let name = $(this).find("td:nth-child(3)").text().trim();
			let color = $(this).find("td[style]:last").css("background-color");
			if (!name || !color) return;
			classesByColor[rgb2hex(color)] = name;
		});
		return classesByColor;
	};

	let setClassNamesInTable = function () {
		let classesByColor = getClassesByColor();
		let last = null;

		$(".std-canvas table:last tr:not(:first) td").each(function () {
			let color = rgb2hex($(this).css("background-color"));
			if (color && last !== color && classesByColor[color]) {
				$(this).text(utils.trimCourseName(classesByColor[color]));
				$(this).addClass("name-container");
			}
			last = color;
		});
	};

	let addTimeInfo = function () {
		$(".std-canvas table:first tr:not(:first)").each(function () {
			let $td = $(this).find("td:nth-child(6)");
			if (!$td.length) return;

			let schedules = utils.getSchedulesFromString($td.text());
			$td.html($td.text() + "<br /><b>" + utils.getTimeInfoStringFromSchedules(schedules) + "</b>");
		});
	};

	let addPoweredBy = function () {
		$(".std-canvas table").parent().css("display", "inline-block").append("<span class='powered-by-siga-helper'></span>");
	};

	// Init
	(function () {
		addTimeInfo();
		setClassNamesInTable();
		addPoweredBy();
	})();

	// Public
	return {};
};
