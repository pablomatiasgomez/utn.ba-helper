import './HorariosPage.css';

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
		document.querySelectorAll(".cursada .cursada-header").forEach(element => {
			let name = element.querySelector("h4").textContent.trim();
			let color = this.#getColorFromClass(element.querySelector(".cuadrado").className);
			if (!name || !color) return;
			classesByColor[color] = name;
		});
		return classesByColor;
	}

	#setCourseNamesInTable() {
		let classesByColor = this.#getClassesByColor();
		let last = null;
		document.querySelectorAll(".agenda-hora").forEach(element => {
			let color = this.#getColorFromClass(element.className);
			if (color && last !== color && classesByColor[color]) {
				element.textContent = this.#trimCourseName(classesByColor[color]);
				element.classList.add("name-container");
			}
			last = color;
		});
	}

	init() {
		return Promise.resolve().then(() => {
			this.#setCourseNamesInTable();
		});
	}

	close() {
	}
}
