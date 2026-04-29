import {log} from "@embrace-io/web-sdk";

export class CoursesSearchCustomPage {
	static menuName = "Buscar cursos";
	static customParamKey = "courseCode";

	#container;
	#services;
	#searchDiv;
	#searchResultsDiv;
	#courseDataDiv;
	// Used to add a separator between rows that change year and quarter
	#lastYear;
	#lastQuarter;

	constructor(container, services) {
		this.#container = container;
		this.#services = services;
	}

	#createPage() {
		this.#searchDiv = document.createElement("div");
		this.#searchDiv.className = "search-section";
		this.#searchDiv.insertAdjacentHTML("beforeend", `<span>Buscar por nombre o código de materia: </span>`);
		let searchTxt = document.createElement("input");
		searchTxt.type = "text";
		searchTxt.placeholder = "Minimo 3 caracteres...";
		searchTxt.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				this.#services.utils.runAsync("CoursesSearch", () => this.#search(searchTxt.value.trim()));
				e.preventDefault();
			}
		});
		this.#searchDiv.appendChild(searchTxt);
		let searchBtn = document.createElement("a");
		searchBtn.href = "#";
		searchBtn.className = "btn btn-info btn-small";
		searchBtn.textContent = "Buscar";
		searchBtn.addEventListener("click", (e) => {
			this.#services.utils.runAsync("CoursesSearch", () => this.#search(searchTxt.value.trim()));
			e.preventDefault();
		});
		this.#searchDiv.appendChild(searchBtn);
		this.#searchDiv.insertAdjacentHTML("beforeend", "<hr>");
		this.#container.appendChild(this.#searchDiv);

		this.#searchResultsDiv = document.createElement("div");
		this.#searchResultsDiv.style.display = "none";
		this.#searchResultsDiv.insertAdjacentHTML("beforeend", "<h2>Resultados de busqueda</h2>");
		let searchResultsTable = document.createElement("table");
		searchResultsTable.appendChild(document.createElement("tbody"));
		searchResultsTable.addEventListener("click", (e) => {
			let a = e.target.closest("a");
			if (!a || !searchResultsTable.contains(a)) return;
			let courseCode = a.textContent;
			this.#services.utils.runAsync("retrieveClassesForCourse", () => this.#retrieveClassesForCourse(courseCode, 0, 15));
			e.preventDefault();
		});
		this.#searchResultsDiv.appendChild(searchResultsTable);
		this.#searchResultsDiv.insertAdjacentHTML("beforeend", "<hr>");
		this.#container.appendChild(this.#searchResultsDiv);

		this.#courseDataDiv = document.createElement("div");
		this.#courseDataDiv.style.display = "none";
		this.#courseDataDiv.insertAdjacentHTML("beforeend", "<h2>Resultados para </h2>");
		let classesTable = document.createElement("table");
		classesTable.appendChild(document.createElement("tbody"));
		this.#courseDataDiv.appendChild(classesTable);
		this.#courseDataDiv.insertAdjacentHTML("beforeend", "<hr>");
		this.#container.appendChild(this.#courseDataDiv);
	}

	async #search(query) {
		if (query.length < 3) return;
		this.#searchResultsDiv.style.display = "";
		this.#searchResultsDiv.scrollIntoView({behavior: "smooth"});
		this.#searchResultsDiv.style.display = "none";
		this.#courseDataDiv.style.display = "none";
		log.message("Searching courses", 'info', {attributes: {query: query}});
		let results = await this.#services.apiConnector.searchCourses(query);
		let trs = results.map(item => {
			return `<tr><td>${item.value}</td><td><a href="#">${item.data}</a></td></tr>`;
		}).join("");
		this.#searchResultsDiv.style.display = "";
		let tbody = this.#searchResultsDiv.querySelector("table tbody");
		tbody.innerHTML = trs;
		tbody.insertAdjacentHTML("afterbegin", "<tr><th>Nombre</th><th>Codigo</th></tr>");
	}

	async #retrieveClassesForCourse(courseCode, offset, limit) {
		if (offset === 0) {
			this.#courseDataDiv.style.display = "";
			this.#courseDataDiv.scrollIntoView({behavior: "smooth"});
			this.#courseDataDiv.style.display = "none";
		}
		let classSchedules = await this.#services.apiConnector.getClassesForCourse(courseCode, offset, limit);
		if (offset === 0) {
			this.#lastYear = this.#lastQuarter = null;
			this.#courseDataDiv.querySelector("h2").textContent = `Resultados para ${courseCode}`;
			this.#courseDataDiv.style.display = "";
			let tbody = this.#courseDataDiv.querySelector("table tbody");
			tbody.innerHTML = `
				<tr><th colspan="2">Cuatr.</th><th>Curso</th><th>Anexo</th><th>Horario</th><th>Profesores</th></tr>
				<tr><td colspan="6"><a href="#">Ver mas resultados...</a></td></tr>`;
			tbody.lastElementChild.querySelector("a").addEventListener("click", (e) => {
				this.#services.utils.runAsync("retrieveClassesForCoursePage", () => this.#retrieveClassesForCourse(courseCode, offset += limit, limit));
				e.preventDefault();
			});
		}
		if (classSchedules.length < limit) {
			this.#courseDataDiv.querySelector("table tbody").lastElementChild.style.display = "none";
		}
		this.#appendClassesToTable(classSchedules);
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
		this.#courseDataDiv.querySelector("table tbody").lastElementChild.insertAdjacentHTML("beforebegin", trs);
	}

	async init() {
		this.#createPage();
		let courseCode = new URLSearchParams(window.location.search).get(CoursesSearchCustomPage.customParamKey);
		if (courseCode) {
			return this.#retrieveClassesForCourse(courseCode, 0, 15);
		}
	}

	close() {
	}
}
