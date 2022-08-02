if (!window.UtnBaHelper) window.UtnBaHelper = {};
UtnBaHelper.HorariosPage = function () {

	let trimCourseName = function (name) {
		name = name.trim();
		if (name.length > 20) {
			return name.substring(0, 20) + "...";
		} else {
			return name;
		}
	};

	let getColorFromClass = function (className) {
		const colorRegex = /materia-color-(\d*)/;
		let groups = colorRegex.exec(className);
		if (!groups) return null;
		return groups[1];
	};

	let getClassesByColor = function () {
		let classesByColor = {};
		$(".cursada .cursada-header").each(function () {
			let name = $(this).find("h4").text().trim();
			let color = getColorFromClass($(this).find(".cuadrado").attr("class"));
			if (!name || !color) return;
			classesByColor[color] = name;
		});
		return classesByColor;
	};

	let setCourseNamesInTable = function () {
		let classesByColor = getClassesByColor();
		let last = null;
		$(".agenda-hora").each(function () {
			let color = getColorFromClass($(this).attr("class"));
			if (color && last !== color && classesByColor[color]) {
				$(this).text(trimCourseName(classesByColor[color]));
				$(this).addClass("name-container");
			}
			last = color;
		});
	};


	return {
		init: function () {
			return Promise.resolve().then(() => {
				setCourseNamesInTable();
			});
		},
		close: function () {
		},
	};
};
