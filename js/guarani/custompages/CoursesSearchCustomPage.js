if (!window.UtnBaHelper) window.UtnBaHelper = {};
UtnBaHelper.CoursesSearchCustomPage = function ($container, services) {

	let $searchDiv;
	let $searchResultsDiv;
	let $courseDataDiv;

	let createPage = function () {
		$searchDiv = $("<div></div>");
		$searchDiv.append(`<span style="font-weight: bold;">Buscar por nombre o código de materia: </span>`);
		let $searchTxt = $(`<input type="text" style="margin: 0 5px 0 0;" placeholder="Minimo 3 caracteres..." />`);
		$searchTxt.on("keydown", function (e) {
			if (e.key === "Enter") {
				services.utils.runAsync("CoursesSearch", () => search($searchTxt.val().trim()));
				return false;
			}
		});
		$searchDiv.append($searchTxt);
		let $searchBtn = $(`<a href="#" class="btn btn-info btn-small">Buscar</a>`);
		$searchBtn.on("click", function () {
			services.utils.runAsync("CoursesSearch", () => search($searchTxt.val().trim()));
			return false;
		});
		$searchDiv.append($searchBtn);
		$searchDiv.append("<hr>");
		$container.append($searchDiv);

		$searchResultsDiv = $(`<div></div>`);
		$searchResultsDiv.hide();
		$searchResultsDiv.append("<h2>Resultados de busqueda</h2>");
		let $searchResultsTable = $(`<table></table>`).append("<tbody></tbody>");
		$searchResultsTable.on("click", "a", function () {
			let courseCode = $(this).text();
			services.utils.runAsync("retrieveClassesForCourse", () => retrieveClassesForCourse(courseCode, 0, 15));
			return false;
		});
		$searchResultsDiv.append($searchResultsTable);
		$searchResultsDiv.append("<hr>");
		$container.append($searchResultsDiv);

		$courseDataDiv = $(`<div></div>`);
		$courseDataDiv.hide();
		$courseDataDiv.append("<h2>Resultados para </h2>");
		let $classesTable = $(`<table></table>`).append("<tbody></tbody>");
		$courseDataDiv.append($classesTable);
		$courseDataDiv.append("<hr>");
		$container.append($courseDataDiv);
	};

	let search = function (query) {
		if (query.length < 3) return;
		$searchResultsDiv.show().get(0).scrollIntoView({behavior: "smooth"});
		$searchResultsDiv.hide();
		$courseDataDiv.hide();
		window.EmbraceWebSdk.log.message("Searching courses", 'info', {attributes: {query: query}});
		return services.apiConnector.searchCourses(query).then(results => {
			let trs = results.map(item => {
				return `<tr><td>${item.value}</td><td><a href="#">${item.data}</a></td></tr>`;
			}).join("");
			$searchResultsDiv.show();
			$searchResultsDiv.find("table tbody")
				.html(trs)
				.prepend("<tr><th>Nombre</th><th>Codigo</th></tr>");
		});
	};

	/** Used to add a separator between rows that change year and quarter */
	let lastYear;
	let lastQuarter;

	let retrieveClassesForCourse = function (courseCode, offset, limit) {
		if (offset === 0) {
			$courseDataDiv.show().get(0).scrollIntoView({behavior: "smooth"});
			$courseDataDiv.hide();
		}
		return services.apiConnector.getClassesForCourse(courseCode, offset, limit).then(classSchedules => {
			if (offset === 0) {
				lastYear = lastQuarter = null;
				$courseDataDiv.find("h2").text(`Resultados para ${courseCode}`);
				$courseDataDiv.show();
				$courseDataDiv.find("table tbody")
					.html(`
					<tr><th colspan="2">Cuatr.</th><th>Curso</th><th>Anexo</th><th>Horario</th><th>Profesores</th></tr>
					<tr><td colspan="6"><a href="#">Ver mas resultados...</a></td></tr>`);
				$courseDataDiv.find("table tbody tr:last a").on("click", function () {
					services.utils.runAsync("retrieveClassesForCoursePage", () => retrieveClassesForCourse(courseCode, offset += limit, limit));
					return false;
				});
			}
			if (classSchedules.length < limit) {
				$courseDataDiv.find("table tbody tr:last").hide();
			}
			appendClassesToTable(classSchedules);
		});
	};

	let appendClassesToTable = function (classSchedules) {
		let trs = classSchedules.map(classSchedule => {
			let professorLis = (classSchedule.professors || []).map(professor => {
				return services.utils.getProfessorLi(professor);
			}).join("");
			let trClass = (lastYear && lastYear !== classSchedule.year) ? "top-border" : (lastQuarter && lastQuarter !== classSchedule.quarter) ? "top-border-without-first-cell" : "";
			lastYear = classSchedule.year;
			lastQuarter = classSchedule.quarter;
			return `<tr class="${trClass}">
					<td>${classSchedule.year}</td>
					<td>${classSchedule.quarter}</td>
					<td>${classSchedule.classCode}</td>
					<td>${classSchedule.branch || "-"}</td>
					<td>${services.utils.getSchedulesAsString(classSchedule.schedules)}</td>
					<td><ul class="no-margin">${professorLis}</ul></td>
				</tr>`;
		}).join("");
		$courseDataDiv.find("table tbody tr:last").before(trs);
	};


	return {
		init: function () {
			return Promise.resolve().then(() => {
				createPage();
				let courseCode = new URLSearchParams(window.location.search).get(UtnBaHelper.CoursesSearchCustomPage.customParamKey);
				if (courseCode) {
					return retrieveClassesForCourse(courseCode, 0, 15);
				}
			});
		},
		close: function () {
		},
	};
};

UtnBaHelper.CoursesSearchCustomPage.menuName = "Buscar cursos";
UtnBaHelper.CoursesSearchCustomPage.customParamKey = "courseCode";
