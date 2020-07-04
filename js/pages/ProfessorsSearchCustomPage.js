let ProfessorsSearchCustomPage = function ($container, utils, apiConnector) {

	const TEXT_QUESTSIONS = {
		// Good:
		"Mencione las características del docente que ayudaron en su  aprendizaje": "#19B135",
		"Mencione las características del auxiliar docente que ayudaron en su aprendizaje": "#19B135",
		// Neutral:
		"Realice las observaciones y aclaraciones que crea convenientes sobre  las puntuaciones asignadas": "#000000",
		"Realice las observaciones que crea conveniente.": "#000000",
		// Bad:
		"Mencione los aspectos del proceso de enseñanza que deberían mejorarse": "#D51C26",
		"Mencione los aspectos del proceso de enseñanza referidos a los trabajos Prácticos del aula, que pueden mejorarse.": "#D51C26",
	};

	let $searchDiv;
	let $searchResultsDiv;
	let $surveyResultDiv;

	let createPage = function (withSearch) {
		$searchDiv = $("<div></div>");
		$searchDiv.append(`<span class="bold">Buscar docente: </span>`);
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
			let professorName = $(this).text();
			retrieveSurveyResults(professorName);
			return false;
		});
		$container.append($searchResultsDiv);

		$surveyResultDiv = $(`<div></div>`);
		$container.append($surveyResultDiv);
	};

	let search = function (query) {
		if (query.length < 3) return;
		$searchResultsDiv.show().get(0).scrollIntoView({behavior: "smooth"});
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
		$surveyResultDiv.show().get(0).scrollIntoView({behavior: "smooth"});
		$surveyResultDiv.hide();
		return apiConnector.getProfessorSurveysAggregate(professorName).then(response => {
			$surveyResultDiv.html("");
			$surveyResultDiv.append(`<hr><div class="tit1" style="text-align: center;">Resultados para ${professorName}:</div><hr>`);
			Object.entries(response)
				// Put DOCENTE before AUXILIAR
				.sort((a, b) => (a[0] > b[0] ? -1 : 1))
				.forEach(entry => appendSurveyResults(entry[0], entry[1]));
			$surveyResultDiv.show();
		});
	};

	let appendSurveyResults = function (surveyKind, results) {
		$surveyResultDiv.append(`<p>Encuesta de tipo: ${surveyKind}</p>`);

		if (results.percentageFields.length) {
			let percetangeRows = results.percentageFields.map(item => {
				return `<tr><td>${item.question}</td><td style="background-color: ${utils.getColorForAvg(item.average)}">${item.average}</td><td>${item.count}</td></tr>`;
			}).join("");
			$surveyResultDiv.append(`
				<p>Puntaje general: ${utils.getOverallScoreSpan(results.overallScore)}</p>
				<table class="percentage-questions">
					<tbody>
						<tr><th>Pregunta</th><th>Promedio</th><th>Muestra</th></tr>
						${percetangeRows}
					</tbody>
				</table>
			`);
		}

		let textQuestions = Object.keys(TEXT_QUESTSIONS).filter(question => results.textFields[question] && results.textFields[question].length);
		if (textQuestions.length) {
			let textColumns = textQuestions.map(question => {
				let answers = results.textFields[question].map(answer => `<i>"${answer}"</i>`).join(`<hr style="margin: 8px 0;">`);
				return `<td style="color: ${TEXT_QUESTSIONS[question]}">${answers}</td>`;
			}).join("");
			$surveyResultDiv.append(`
				<p>Comentarios:</p>
				<table class="text-questions" style="table-layout: fixed; width: 100%;">
					<tbody>
						<tr>${textQuestions.map(question => `<th>${question}</th>`).join("")}</tr>
						<tr>${textColumns}</tr>
					</tbody>
				</table>
			`);
		}

		$surveyResultDiv.append(`<hr>`);
	};

	// Init
	return Promise.resolve().then(() => {
		createPage();
		let professorName = new URLSearchParams(window.location.search).get("professorName");
		if (professorName) {
			return retrieveSurveyResults(professorName);
		}
	});
};
