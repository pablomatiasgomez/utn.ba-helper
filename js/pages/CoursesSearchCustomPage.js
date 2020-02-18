let CoursesSearchCustomPage = function ($container, utils, apiConnector) {

	let $searchDiv;
	let $searchResultsDiv;
	let $courseDataDiv;

	let createPage = function (withSearch) {
		$searchDiv = $("<div></div>");
		$searchDiv.append(`<span class="bold">Buscar por nombre de materia: </span>`);
		let $searchTxt = $(`<input type="text" class="course-search" placeholder="Minimo 3 caracteres..." />`);
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

	let retrieveClassesForCourse = function (courseCode, offset, limit) {
		if (offset === 0) $courseDataDiv.hide();
		return apiConnector.getClassesForCourse(courseCode, offset, limit).then(results => {
			if (offset === 0) {
				$courseDataDiv.find("p").text(`Resultados para ${courseCode}:`);
				$courseDataDiv.show();
				$courseDataDiv.find("table tbody")
					.html(`
					<tr><th>Año</th><th>Cuatr.</th><th>Curso</th><th>Anexo</th><th>Horario</th><th>Profesores</th></tr>
					<tr><td colspan="6"><a href="#">Ver mas resultados...</a></td></tr>`);
				$courseDataDiv.find("table tbody tr:last a").on("click", function () {
					retrieveClassesForCourse(courseCode, offset += limit, limit);
					return false;
				});
			}
			if (results.length < limit) {
				$courseDataDiv.find("table tbody tr:last").hide();
			}
			appendClassesToTable(results);
		});
	};

	let appendClassesToTable = function (classes) {
		let trs = classes.map(item => {
			let classSchedule = item.classSchedule;
			let professorLis = item.professors.map(professor => {
				return `<li>
					<span style="border: 1px solid grey; background-color: ${utils.getColorForAvg(professor.overallScore)}">${professor.overallScore}</span>
					<a href="${utils.getProfessorSurveyResultsUrl(professor.professorName)}">${professor.professorName}</a>
				</li>`;
			}).join("");
			return `<tr>
					<td>${classSchedule.year}</td>
					<td>${classSchedule.quarter}</td>
					<td>${classSchedule.classCode}</td>
					<td>${classSchedule.branch}</td>
					<td>${utils.getTimeInfoStringFromSchedules(classSchedule.schedules)}</td>
					<td><ul style="padding-inline-start: 15px; margin-block-end: 0; margin-block-start: 0;">${professorLis}</ul></td>
				</tr>`;
		}).join("");
		$courseDataDiv.find("table tbody tr:last").before(trs);
	};

	// Init
	return Promise.resolve().then(() => {
		createPage();
	});
};
