let PreInscripcionPage = function (utils) {

	let getAllUsedHours = function ($table) {
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

		let usedHours = {};

		$table.find("tbody tr").each(function () {
			let $tdAlternates = $(this).find("td:not(:first)");

			if ($tdAlternates.length) {
				let tdClass = $(this).find("td:first").text();
				let selectedClass = {
					classCode: tdClass.match(/\[(.*?)\]/)[1],
					courseName: tdClass.split(" ").slice(1).join(" ")
				};

				$tdAlternates.each(function (alternateIndex) {
					if (!$(this).hasClass("soft-back")) {
						let strArray = utils.getTextNodes($(this));
						if (!strArray.length) {
							strArray = utils.getTextNodes($(this).find("a"));
						}

						if (strArray.length) {
							let str = strArray[0].replace("CAMPUS", "").replace("MEDRANO", ""); // This is not needed, but just in case.

							utils.getSchedulesFromString(str).forEach(function (schedule) {
								let firstHour = parseInt(schedule.firstHour) + (getShiftIndex(schedule.shift) * 7);
								let lastHour = parseInt(schedule.lastHour) + (getShiftIndex(schedule.shift) * 7);

								if (!usedHours[alternateIndex]) {
									usedHours[alternateIndex] = {};
								}
								if (!usedHours[alternateIndex][schedule.day]) {
									usedHours[alternateIndex][schedule.day] = {};
								}
								for (let i = firstHour; i <= lastHour; i++) {
									usedHours[alternateIndex][schedule.day][i] = selectedClass;
								}
							});
						}
					}
				});
			}
		});

		return usedHours;
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
		return "#" + r.toString(16) + g.toString(16) + b.toString(16);
	};

	let setPreviewTable = function (usedHours) {
		let $divContainer = $("<div style='display: inline-block;'>");

		Object.keys(usedHours).forEach(alternateIndex => {
			let $table = $("<table>");
			let $tbody = $("<tbody>");

			$table.append($tbody);
			$tbody.append('<tr><th></th><th colspan="7">Mañana</th><th colspan="7">Tarde</th><th colspan="7">Noche</th></tr>');

			for (let day in utils.DAYS) {
				let $tr = $("<tr>");
				$tr.append($("<td>", {html: utils.DAYS[day]}));

				let lastColor = "";
				for (let i = 0; i <= 19; i++) {
					let selectedClass = usedHours[alternateIndex][day] ? usedHours[alternateIndex][day][i] : null;

					let color = "transparent";
					let text = "&nbsp;";
					if (selectedClass) {
						color = getRandomRGBByCode(selectedClass.classCode);
						if (lastColor !== color) text = utils.trimCourseName(selectedClass.courseName);
					}
					lastColor = color;

					$tr.append($("<td>", {class: "name-container", style: "background-color:" + color, html: text}));
				}
				$tbody.append($tr);
			}

			let $p = $("<p>", {html: "Preview de cursada (Alt " + (parseInt(alternateIndex) + 1) + ")"});
			let $divTable = $("<div>").append($table);
			$divContainer.append($p);
			$divContainer.append($divTable);
			$divContainer.append("<span class='powered-by-siga-helper'></span>");
		});
		$(".std-canvas table:last").parent().after($divContainer);
	};

	(function () {
		let $table = $(".std-canvas table:last");
		let $th = $table.find("tr:first > th:first");

		// Check used to be sure that the given table is the one that has the used hours
		if ($th.length && $th.text() === "") {
			setPreviewTable(getAllUsedHours($table));
		}
	})();

	// Public
	return {};
};
