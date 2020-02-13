let ProfessorsSearchCustomPage = function ($container, utils, apiConnector) {

	let $searchDiv;
	let $searchResultsDiv;
	let $surveyResultDiv;

	let createPage = function (withSearch) {
		$searchDiv = $("<div></div>");
		$searchDiv.append(`<span class="bold">Buscar docente: </span>`);
		let $searchTxt = $(`<input type="text" class="professor-search" placeholder="Minimo 3 caracteres..." />`);
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
			let professorName = $(this).text();
			retrieveSurveyResults(professorName);
			return false;
		});
		$container.append($searchResultsDiv);

		$surveyResultDiv = $(`<div></div>`);
		$surveyResultDiv.hide();
		$surveyResultDiv.append("<hr><p>Resultados de las encuestas:</p>");
		let $surveyResultTable = $(`<table></table>`).append("<tbody></tbody>");
		$surveyResultDiv.append($surveyResultTable);
		$container.append($surveyResultDiv);
		$container.append("<div><span class='powered-by-siga-helper'></span></div>");
	};

	let search = function (query) {
		if (query.length < 3) return;
		$searchResultsDiv.hide();
		$surveyResultDiv.hide();
		return apiConnector.searchProfessors(query).then(results => {
			let trs = results.map(item => {
				return `<tr><td><a href="#">${item.value}</a></td><td>${item.data}</td></tr>`;
			}).join("");
			$searchResultsDiv.show();
			$searchResultsDiv.find("table tbody")
				.html(trs)
				.prepend("<tr><th>Profesor</th><th>Cantidad de encuestas</th></tr>");
		});
	};

	let retrieveSurveyResults = function (professorName) {
		$surveyResultDiv.hide();
		return apiConnector.getProfessorSurveysAggregate(professorName).then(results => {
			let trs = results.map(item => {
				return `<tr><td>${item.question}</td><td style="background-color: ${utils.getColorForAvg(item.average)}">${item.average}</td><td>${item.count}</td></tr>`;
			}).join("");
			$surveyResultDiv.find("p").text(`Resultados para ${professorName}:`);
			$surveyResultDiv.show();
			$surveyResultDiv.find("table tbody")
				.html(trs)
				.prepend("<tr><th>Pregunta</th><th>Average</th><th>Sample size</th></tr>");
		});
	};

	// Init
	(function () {
		createPage();
		let professorName = new URLSearchParams(window.location.search).get("professorName");
		if (professorName) {
			$searchDiv.hide();
			retrieveSurveyResults(professorName);
		}
	})();

	// Public
	return {};
};
