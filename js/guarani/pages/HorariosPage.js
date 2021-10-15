let HorariosPage = function (utils) {

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
				$(this).text(utils.trimCourseName(classesByColor[color]));
				$(this).addClass("name-container");
			}
			last = color;
		});
	};


	// Init
	return Promise.resolve().then(() => {
		setCourseNamesInTable();
	});
};