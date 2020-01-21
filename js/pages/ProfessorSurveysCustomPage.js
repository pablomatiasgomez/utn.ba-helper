let ProfessorSurveysCustomPage = function ($container, utils, apiConnector) {

	let $searchTxt;
	let $resultsTable;
	let $surveyResultDiv;

	let createPage = function () {
		let $divFilters = $("<div</div>");
		$divFilters.append(`<span class="bold">Buscar docente: </span>`);
		$searchTxt = $(`<input type="text" class="professor-search" />`);
		$divFilters.append($searchTxt);
		let $searchBtn = $(`<a href="">Buscar</a>`);
		$searchBtn.on("click", function () {
			search($searchTxt.val());
			return false;
		});
		$divFilters.append($searchBtn);
		$container.append($divFilters);

		$container.append("<hr><p>Resultados:</p>");
		$resultsTable = $(`<table></table>`).append("<tbody></tbody>");
		$container.append($resultsTable);
		$resultsTable.on("click", "a", function () {
			let professorName = $(this).text();
			retrieveSurveyResults(professorName);
			return false;
		});

		$container.append("<hr><p>Puntaje:</p>");
		$surveyResultDiv = $(`<div></div>`);
		$container.append($surveyResultDiv);
	};

	let search = function (query) {
		console.log("Searching for ", query);

		return apiConnector.searchProfessors(query).then(results => {
			let trs = results.map(item => {
				return `<tr><td><a>${item.professorName}</a></td><td>${item.surveysCount}</td></tr>`;
			}).join("");
			$resultsTable.find("tbody")
				.html(trs)
				.prepend("<tr><th>Profesor</th><th>Cantidad de encuestas</th></tr>");
		});
	};

	let retrieveSurveyResults = function (professorName) {
		console.log("retrieveSurveyResults", professorName);
	};

	// Init
	(function () {
		createPage();
	})();

	// Public
	return {};
};
