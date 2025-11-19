import {log} from "@embrace-io/web-sdk";

export class CoursesSearchCustomPage {
	static menuName = "Buscar cursos";
	static customParamKey = "courseCode";

	#$container;
	#services;
	#$searchDiv;
	#$searchResultsDiv;
	#$courseDataDiv;
	// Used to add a separator between rows that change year and quarter
	#lastYear;
	#lastQuarter;

	constructor($container, services) {
		this.#$container = $container;
		this.#services = services;
	}

	#createPage() {
		this.#$searchDiv = $("<div></div>");
		this.#$searchDiv.append(`<span style="font-weight: bold;">Buscar por nombre o código de materia: </span>`);
		let $searchTxt = $(`<input type="text" style="margin: 0 5px 0 0;" placeholder="Minimo 3 caracteres..." />`);
		$searchTxt.on("keydown", (e) => {
			if (e.key === "Enter") {
				this.#services.utils.runAsync("CoursesSearch", () => this.#search($searchTxt.val().trim()));
				return false;
			}
		});
		this.#$searchDiv.append($searchTxt);
		let $searchBtn = $(`<a href="#" class="btn btn-info btn-small">Buscar</a>`);
		$searchBtn.on("click", () => {
			this.#services.utils.runAsync("CoursesSearch", () => this.#search($searchTxt.val().trim()));
			return false;
		});
		this.#$searchDiv.append($searchBtn);
		this.#$searchDiv.append("<hr>");
		this.#$container.append(this.#$searchDiv);

		this.#$searchResultsDiv = $(`<div></div>`);
		this.#$searchResultsDiv.hide();
		this.#$searchResultsDiv.append("<h2>Resultados de busqueda</h2>");
		let $searchResultsTable = $(`<table></table>`).append("<tbody></tbody>");
		$searchResultsTable.on("click", "a", (e) => {
			let courseCode = $(e.currentTarget).text();
			this.#services.utils.runAsync("retrieveClassesForCourse", () => this.#retrieveClassesForCourse(courseCode, 0, 15));
			return false;
		});
		this.#$searchResultsDiv.append($searchResultsTable);
		this.#$searchResultsDiv.append("<hr>");
		this.#$container.append(this.#$searchResultsDiv);

		this.#$courseDataDiv = $(`<div></div>`);
		this.#$courseDataDiv.hide();
		this.#$courseDataDiv.append("<h2>Resultados para </h2>");
		let $classesTable = $(`<table></table>`).append("<tbody></tbody>");
		this.#$courseDataDiv.append($classesTable);
		this.#$courseDataDiv.append("<hr>");
		this.#$container.append(this.#$courseDataDiv);
	}

	#search(query) {
		if (query.length < 3) return;
		this.#$searchResultsDiv.show().get(0).scrollIntoView({behavior: "smooth"});
		this.#$searchResultsDiv.hide();
		this.#$courseDataDiv.hide();
		log.message("Searching courses", 'info', {attributes: {query: query}});
		return this.#services.apiConnector.searchCourses(query).then(results => {
			let trs = results.map(item => {
				return `<tr><td>${item.value}</td><td><a href="#">${item.data}</a></td></tr>`;
			}).join("");
			this.#$searchResultsDiv.show();
			this.#$searchResultsDiv.find("table tbody")
				.html(trs)
				.prepend("<tr><th>Nombre</th><th>Codigo</th></tr>");
		});
	}

	#retrieveClassesForCourse(courseCode, offset, limit) {
		if (offset === 0) {
			this.#$courseDataDiv.show().get(0).scrollIntoView({behavior: "smooth"});
			this.#$courseDataDiv.hide();
		}
		return this.#services.apiConnector.getClassesForCourse(courseCode, offset, limit).then(classSchedules => {
			if (offset === 0) {
				this.#lastYear = this.#lastQuarter = null;
				this.#$courseDataDiv.find("h2").text(`Resultados para ${courseCode}`);
				this.#$courseDataDiv.show();
				this.#$courseDataDiv.find("table tbody")
					.html(`
					<tr><th colspan="2">Cuatr.</th><th>Curso</th><th>Anexo</th><th>Horario</th><th>Profesores</th></tr>
					<tr><td colspan="6"><a href="#">Ver mas resultados...</a></td></tr>`);
				this.#$courseDataDiv.find("table tbody tr:last a").on("click", () => {
					this.#services.utils.runAsync("retrieveClassesForCoursePage", () => this.#retrieveClassesForCourse(courseCode, offset += limit, limit));
					return false;
				});
			}
			if (classSchedules.length < limit) {
				this.#$courseDataDiv.find("table tbody tr:last").hide();
			}
			this.#appendClassesToTable(classSchedules);
		});
	}

	#appendClassesToTable(classSchedules) {
		let trs = classSchedules.map(classSchedule => {
			let professorLis = (classSchedule.professors || []).map(professor => {
				return this.#services.utils.getProfessorLi(professor);
			}).join("");
			let trClass = (this.#lastYear && this.#lastYear !== classSchedule.year) ? "top-border" : (this.#lastQuarter && this.#lastQuarter !== classSchedule.quarter) ? "top-border-without-first-cell" : "";
			this.#lastYear = classSchedule.year;
			this.#lastQuarter = classSchedule.quarter;
			return `<tr class="${trClass}">
					<td>${classSchedule.year}</td>
					<td>${classSchedule.quarter}</td>
					<td>${classSchedule.classCode}</td>
					<td>${classSchedule.branch || "-"}</td>
					<td>${this.#services.utils.getSchedulesAsString(classSchedule.schedules)}</td>
					<td><ul class="no-margin">${professorLis}</ul></td>
				</tr>`;
		}).join("");
		this.#$courseDataDiv.find("table tbody tr:last").before(trs);
	}

	init() {
		return Promise.resolve().then(() => {
			this.#createPage();
			let courseCode = new URLSearchParams(window.location.search).get(CoursesSearchCustomPage.customParamKey);
			if (courseCode) {
				return this.#retrieveClassesForCourse(courseCode, 0, 15);
			}
		});
	}

	close() {
	}
}
