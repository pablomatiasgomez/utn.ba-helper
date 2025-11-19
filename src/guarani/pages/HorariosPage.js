export class HorariosPage {

	#trimCourseName(name) {
		name = name.trim();
		if (name.length > 20) {
			return name.substring(0, 20) + "...";
		} else {
			return name;
		}
	}

	#getColorFromClass(className) {
		const colorRegex = /materia-color-(\d*)/;
		let groups = colorRegex.exec(className);
		if (!groups) return null;
		return groups[1];
	}

	#getClassesByColor() {
		let classesByColor = {};
		$(".cursada .cursada-header").each(function () {
			let name = $(this).find("h4").text().trim();
			let color = this.#getColorFromClass($(this).find(".cuadrado").attr("class"));
			if (!name || !color) return;
			classesByColor[color] = name;
		}.bind(this)); // TODO is this needed?
		return classesByColor;
	}

	#setCourseNamesInTable() {
		let classesByColor = this.#getClassesByColor();
		let last = null;
		$(".agenda-hora").each(function () {
			let color = this.#getColorFromClass($(this).attr("class"));
			if (color && last !== color && classesByColor[color]) {
				$(this).text(this.#trimCourseName(classesByColor[color]));
				$(this).addClass("name-container");
			}
			last = color;
		}.bind(this));
	}

	init() {
		return Promise.resolve().then(() => {
			this.#setCourseNamesInTable();
		});
	}

	close() {
	}
}
