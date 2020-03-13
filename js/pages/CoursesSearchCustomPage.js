let CoursesSearchCustomPage = function ($container, utils, apiConnector) {

	let $searchDiv;
	let $searchResultsDiv;
	let $courseDataDiv;

	let createPage = function (withSearch) {
		$searchDiv = $("<div></div>");
		$searchDiv.append(`<span class="bold">Buscar por nombre de materia: </span>`);
		let $searchTxt = $(`<input type="text" placeholder="Minimo 3 caracteres..." />`);
		$searchTxt.on("keydown", function (e) {
			if (e.key === "Enter") {
				search($searchTxt.val());
				return false;
			}
		});
		$searchDiv.append($searchTxt);
		let $searchBtn = $(`<a href="#">Buscar</a>`);
		$searchBtn.on("click", function () {
			search($searchTxt.val());
			return false;
		});
		$searchDiv.append($searchBtn);
		$container.append($searchDiv);

		$searchResultsDiv = $(`<div></div>`);
		$searchResultsDiv.hide();
		$searchResultsDiv.append("<hr><p>Resultados de busqueda:</p>");
		let $searchResultsTable = $(`<table></table>`).append("<tbody></tbody>");
		$searchResultsDiv.append($searchResultsTable);
		$searchResultsTable.on("click", "a", function () {
			let courseCode = $(this).text();
			retrieveClassesForCourse(courseCode, 0, 10);
			return false;
		});
		$container.append($searchResultsDiv);

		$courseDataDiv = $(`<div></div>`);
		$courseDataDiv.hide();
		$courseDataDiv.append("<hr><p>Cursadas:</p>");
		let $classesTable = $(`<table></table>`).append("<tbody></tbody>");
		$courseDataDiv.append($classesTable);
		$container.append($courseDataDiv);
		$container.append("<div><span class='powered-by-siga-helper'></span></div>");
	};

	let search = function (query) {
		if (query.length < 3) return;
		$searchResultsDiv.hide();
		$courseDataDiv.hide();
		return apiConnector.searchCourses(query).then(results => {
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
		if (offset === 0) $courseDataDiv.hide();
		return apiConnector.getClassesForCourse(courseCode, offset, limit).then(classSchedules => {
			if (offset === 0) {
				lastYear = lastQuarter = null;
				$courseDataDiv.find("p").text(`Resultados para ${courseCode}:`);
				$courseDataDiv.show();
				$courseDataDiv.find("table tbody")
					.html(`
					<tr><th colspan="2">Cuatr.</th><th>Curso</th><th>Anexo</th><th>Horario</th><th>Profesores</th></tr>
					<tr><td colspan="6"><a href="#">Ver mas resultados...</a></td></tr>`);
				$courseDataDiv.find("table tbody tr:last a").on("click", function () {
					retrieveClassesForCourse(courseCode, offset += limit, limit);
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
				return utils.getProfessorLi(professor);
			}).join("");
			let trClass = lastYear !== classSchedule.year ? "top-border" : lastQuarter !== classSchedule.quarter ? "top-border-without-first-cell" : "";
			lastYear = classSchedule.year;
			lastQuarter = classSchedule.quarter;
			return `<tr class="${trClass}">
					<td>${classSchedule.year}</td>
					<td>${classSchedule.quarter}</td>
					<td>${classSchedule.classCode}</td>
					<td>${classSchedule.branch || "-"}</td>
					<td>${utils.getTimeInfoStringFromSchedules(classSchedule.schedules)}</td>
					<td><ul class="no-margin">${professorLis}</ul></td>
				</tr>`;
		}).join("");
		$courseDataDiv.find("table tbody tr:last").before(trs);
	};

	// Init
	return Promise.resolve().then(() => {
		createPage();
	});
};
