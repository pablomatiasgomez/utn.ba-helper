if (!window.UtnBaHelper) window.UtnBaHelper = {};
UtnBaHelper.ProfessorsSearchCustomPage = function ($container, services) {

	const SENTIMENT_COLORS = {
		"POSITIVE": "#19B135",
		"NEUTRAL": "#000000",
		"NEGATIVE": "#D51C26",
	}

	let $searchDiv;
	let $searchResultsDiv;
	let $professorResultsTitleDiv; // Just the title with the professor name.
	let $coursesResultDiv; // Shows the last courses in which the professor was present
	let $surveyResultDiv; // Shows the survey results of the given professor

	let createPage = function () {
		$searchDiv = $("<div></div>");
		$searchDiv.append(`<span style="font-weight: bold;">Buscar docente: </span>`);
		let $searchTxt = $(`<input type="text" style="margin: 0 5px 0 0;" placeholder="Minimo 3 caracteres..." />`);
		$searchTxt.on("keydown", function (e) {
			if (e.key === "Enter") {
				services.utils.runAsync("ProfessorsSearch", () => search($searchTxt.val().trim()));
				return false;
			}
		});
		$searchDiv.append($searchTxt);
		let $searchBtn = $(`<a href="#" class="btn btn-info btn-small">Buscar</a>`);
		$searchBtn.on("click", function () {
			services.utils.runAsync("ProfessorsSearch", () => search($searchTxt.val().trim()));
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
			let professorName = $(this).text();
			services.utils.runAsync("retrieveProfessorData", () => retrieveProfessorData(professorName));
			return false;
		});
		$searchResultsDiv.append($searchResultsTable);
		$searchResultsDiv.append("<hr>");
		$container.append($searchResultsDiv);

		$professorResultsTitleDiv = $(`<div></div>`);
		$container.append($professorResultsTitleDiv);
		$coursesResultDiv = $(`<div></div>`);
		$container.append($coursesResultDiv);
		$surveyResultDiv = $(`<div></div>`);
		$container.append($surveyResultDiv);
	};

	let search = function (query) {
		if (query.length < 3) return;
		hideProfessorData();
		$searchResultsDiv.show().get(0).scrollIntoView({behavior: "smooth"});
		$searchResultsDiv.hide();
		return services.apiConnector.searchProfessors(query).then(results => {
			let trs = results.map(item => {
				return `<tr><td><a href="#">${item.value}</a></td><td>${item.data.surveysCount}</td><td>${item.data.classScheduleOccurrences}</td></tr>`;
			}).join("");
			$searchResultsDiv.show();
			$searchResultsDiv.find("table tbody")
				.html(trs)
				.prepend("<tr><th>Profesor</th><th>Cantidad de encuestas (total historico)</th><th>Cantidad de cursos (total historico)</th></tr>");
		});
	};

	let hideProfessorData = function () {
		$professorResultsTitleDiv.hide();
		$coursesResultDiv.hide();
		$surveyResultDiv.hide();
	};

	let retrieveProfessorData = function (professorName) {
		$professorResultsTitleDiv.show().get(0).scrollIntoView({behavior: "smooth"});
		$professorResultsTitleDiv.html(`<h2 style="text-align: center;">Resultados para ${professorName}</h2><hr>`);
		return Promise.all([
			retrieveProfessorCourses(professorName),
			retrieveSurveyResults(professorName),
		]);
	};

	let retrieveProfessorCourses = function (professorName) {
		$coursesResultDiv.hide();
		// For now, we are showing just the latest 20 classes.
		return services.apiConnector.getClassesForProfessor(professorName, 0, 20).then(classSchedules => {
			$coursesResultDiv.html("");
			let trs = classSchedules.map(classSchedule => {
				let professorLis = (classSchedule.professors || []).map(professor => {
					return services.utils.getProfessorLi(professor);
				}).join("");
				return `<tr>
					<td>${classSchedule.year}</td>
					<td>${classSchedule.quarter}</td>
					<td><a class="no-ajax" href="${UtnBaHelper.CustomPages.getCourseResultsUrl(classSchedule.courseCode)}" target="_blank">${classSchedule.courseName}</a></td>
					<td>${classSchedule.classCode}</td>
					<td>${classSchedule.branch || "-"}</td>
					<td>${services.utils.getSchedulesAsString(classSchedule.schedules)}</td>
					<td><ul class="no-margin">${professorLis}</ul></td>
				</tr>`;
			}).join("");
			$coursesResultDiv.append(`
				<h3>Ultimos cursos en los que estuvo presente</h3>
				<table>
					<tbody>
						<tr><th colspan="2">Cuatr.</th><th>Materia</th><th>Curso</th><th>Anexo</th><th>Horario</th><th>Profesores</th></tr>
						${trs}
					</tbody>
				</table>
			`);
			$coursesResultDiv.append(`<hr>`);
			$coursesResultDiv.show();
		});
	};

	let retrieveSurveyResults = function (professorName) {
		$surveyResultDiv.hide();
		return services.apiConnector.getProfessorSurveysAggregate(professorName).then(response => {
			$surveyResultDiv.html("");
			Object.entries(response)
				// Put DOCENTE before AUXILIAR
				.sort((a, b) => (a[0] > b[0] ? -1 : 1))
				.forEach(entry => appendSurveyResults(entry[0], entry[1]));
			$surveyResultDiv.show();
		});
	};

	let appendSurveyResults = function (surveyKind, results) {
		$surveyResultDiv.append(`<h3>Encuesta de tipo ${surveyKind}</h3>`);

		if (results.historicalScores && Object.keys(results.historicalScores).length) {
			let canvasId = `historical-score-${surveyKind}`;

			$surveyResultDiv.append(`
				<div style="height: 400px; width: 100%;"><canvas id="${canvasId}"></canvas></div>
			`);

			let minYear, maxYear;
			Object.values(results.historicalScores).forEach(historicalScores => {
				historicalScores.forEach(historicalScore => {
					let year = parseInt(historicalScore.year);
					if (!minYear || year < minYear) minYear = year;
					if (!maxYear || year > maxYear) maxYear = year;
				});
			});

			let canvas = document.getElementById(canvasId);
			new Chart(canvas, {
					type: 'line',
					data: {
						// All years in between as labels
						labels: Array.from({length: maxYear - minYear + 1}, (_, i) => minYear + i),
						datasets: Object.entries(results.historicalScores).map(historicalScore => {
							let courseName = historicalScore[0];
							let historicalScores = historicalScore[1];

							let data = Array.from({length: maxYear - minYear + 1}, (_, i) => {
								let year = minYear + i;
								// Not ideal to use `find` but these are usually a few datapoints so it's fine...
								let score = historicalScores.find(score => parseInt(score.year) === year);
								return score ? score.overallScore : undefined;
							});
							return {
								label: courseName,
								data: data,
							};
						})
					},
					plugins: [
						{
							id: 'backgroundColor',
							beforeDraw: (chart) => {
								let backgroundRules = [
									{from: 0, to: 60},
									{from: 60, to: 80},
									{from: 80, to: 100},
								];

								let xAxis = chart.scales.x;
								let yAxis = chart.scales.y;
								backgroundRules.forEach(rule => {
									let yTop = yAxis.top + (yAxis.height / 100 * (100 - rule.to));
									let yHeight = yAxis.height / 100 * (rule.to - rule.from);
									chart.ctx.fillStyle = services.utils.getColorForAvg(rule.from, 0.1);
									chart.ctx.fillRect(xAxis.left, yTop, xAxis.width, yHeight);
								});
							}
						},
					],
					options: {
						maintainAspectRatio: false,
						plugins: {
							title: {
								display: true,
								text: 'Puntajes históricos',
							},
						},
						scales: {
							y: {
								suggestedMin: 0,
								suggestedMax: 100,
							},
						},
					},
				}
			);
		}


		if (results.percentageFields.length) {
			let percentageRows = results.percentageFields.map(item => {
				return `<tr><td>${item.question}</td><td style="background-color: ${services.utils.getColorForAvg(item.average)}">${item.average}</td><td>${item.count}</td></tr>`;
			}).join("");
			$surveyResultDiv.append(`
				<h4>Puntajes</h4>
				<div style="font-weight: bold; margin-bottom: 12px;">General: ${services.utils.getOverallScoreSpan(results.overallScore)}</div>
				<table class="percentage-questions">
					<tbody>
						<tr><th>Pregunta</th><th>Promedio</th><th>Muestra</th></tr>
						${percentageRows}
					</tbody>
				</table>
			`);
		}

		if (results.textFields.length) {
			let textHeaderColumns = results.textFields.map(item => {
				return `<th>${item.question}</th>`;
			}).join("");
			let textValueColumns = results.textFields.map(item => {
				let answers = item.values.map(answer => `<i>"${answer}"</i>`).join(`<hr style="margin: 8px 0;">`);
				return `<td style="color: ${SENTIMENT_COLORS[item.sentiment]}">${answers}</td>`;
			}).join("");
			$surveyResultDiv.append(`
				<h4>Comentarios</h4>
				<table class="text-questions" style="table-layout: fixed; width: 100%;">
					<tbody>
						<tr>${textHeaderColumns}</tr>
						<tr>${textValueColumns}</tr>
					</tbody>
				</table>
			`);
		}
		$surveyResultDiv.append(`<hr>`);
	};


	return {
		init: function () {
			return Promise.resolve().then(() => {
				createPage();
				let professorName = new URLSearchParams(window.location.search).get(UtnBaHelper.ProfessorsSearchCustomPage.customParamKey);
				if (professorName) {
					return retrieveProfessorData(professorName);
				}
			});
		},
		close: function () {
		},
	};
};

UtnBaHelper.ProfessorsSearchCustomPage.menuName = "Buscar docentes";
UtnBaHelper.ProfessorsSearchCustomPage.customParamKey = "professorName";
