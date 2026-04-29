import './ProfessorsSearchCustomPage.css';

import {Chart} from 'chart.js/auto';
import {log} from "@embrace-io/web-sdk";
import {CustomPages} from './CustomPages.js';

const SENTIMENT_COLORS = {
	"POSITIVE": "#19B135",
	"NEUTRAL": "#000000",
	"NEGATIVE": "#D51C26",
}

export class ProfessorsSearchCustomPage {
	static menuName = "Buscar docentes";
	static customParamKey = "professorName";

	#container;
	#services;
	#searchDiv;
	#searchResultsDiv;
	#professorResultsTitleDiv; // Just the title with the professor name.
	#coursesResultDiv; // Shows the last courses in which the professor was present
	#surveyResultDiv; // Shows the survey results of the given professor

	constructor(container, services) {
		this.#container = container;
		this.#services = services;
	}

	#createPage() {
		this.#searchDiv = document.createElement("div");
		this.#searchDiv.className = "search-section";
		this.#searchDiv.insertAdjacentHTML("beforeend", `<span>Buscar docente: </span>`);
		let searchTxt = document.createElement("input");
		searchTxt.type = "text";
		searchTxt.placeholder = "Minimo 3 caracteres...";
		searchTxt.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				this.#services.utils.runAsync("ProfessorsSearch", () => this.#search(searchTxt.value.trim()));
				e.preventDefault();
			}
		});
		this.#searchDiv.appendChild(searchTxt);
		let searchBtn = document.createElement("a");
		searchBtn.href = "#";
		searchBtn.className = "btn btn-info btn-small";
		searchBtn.textContent = "Buscar";
		searchBtn.addEventListener("click", (e) => {
			this.#services.utils.runAsync("ProfessorsSearch", () => this.#search(searchTxt.value.trim()));
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
			let professorName = a.textContent;
			this.#services.utils.runAsync("retrieveProfessorData", () => this.#retrieveProfessorData(professorName));
			e.preventDefault();
		});
		this.#searchResultsDiv.appendChild(searchResultsTable);
		this.#searchResultsDiv.insertAdjacentHTML("beforeend", "<hr>");
		this.#container.appendChild(this.#searchResultsDiv);

		this.#professorResultsTitleDiv = document.createElement("div");
		this.#container.appendChild(this.#professorResultsTitleDiv);
		this.#coursesResultDiv = document.createElement("div");
		this.#container.appendChild(this.#coursesResultDiv);
		this.#surveyResultDiv = document.createElement("div");
		this.#container.appendChild(this.#surveyResultDiv);
	}

	async #search(query) {
		if (query.length < 3) return;
		this.#hideProfessorData();
		this.#searchResultsDiv.style.display = "";
		this.#searchResultsDiv.scrollIntoView({behavior: "smooth"});
		this.#searchResultsDiv.style.display = "none";
		log.message("Searching professors", 'info', {attributes: {query: query}});
		let results = await this.#services.apiConnector.searchProfessors(query);
		let trs = results.map(item => {
			return `<tr><td><a href="#">${item.value}</a></td><td>${item.data.surveysCount}</td><td>${item.data.classScheduleOccurrences}</td></tr>`;
		}).join("");
		this.#searchResultsDiv.style.display = "";
		let tbody = this.#searchResultsDiv.querySelector("table tbody");
		tbody.innerHTML = trs;
		tbody.insertAdjacentHTML("afterbegin", "<tr><th>Profesor</th><th>Cantidad de encuestas (total historico)</th><th>Cantidad de cursos (total historico)</th></tr>");
	}

	#hideProfessorData() {
		this.#professorResultsTitleDiv.style.display = "none";
		this.#coursesResultDiv.style.display = "none";
		this.#surveyResultDiv.style.display = "none";
	}

	#retrieveProfessorData(professorName) {
		this.#professorResultsTitleDiv.style.display = "";
		this.#professorResultsTitleDiv.scrollIntoView({behavior: "smooth"});
		this.#professorResultsTitleDiv.innerHTML = `<h2 class="professor-title">Resultados para ${professorName}</h2><hr>`;
		return Promise.all([
			this.#retrieveProfessorCourses(professorName),
			this.#retrieveSurveyResults(professorName),
		]);
	}

	async #retrieveProfessorCourses(professorName) {
		this.#coursesResultDiv.style.display = "none";
		// For now, we are showing just the latest 20 classes.
		let classSchedules = await this.#services.apiConnector.getClassesForProfessor(professorName, 0, 20);
		this.#coursesResultDiv.innerHTML = "";
		let trs = classSchedules.map(classSchedule => {
			let professorLis = (classSchedule.professors || []).map(professor => {
				return this.#services.utils.getProfessorLi(professor);
			}).join("");
			return `<tr>
				<td>${classSchedule.year}</td>
				<td>${classSchedule.quarter}</td>
				<td><a class="no-ajax" href="${CustomPages.getCourseResultsUrl(classSchedule.courseCode)}" target="_blank">${classSchedule.courseName}</a></td>
				<td>${classSchedule.classCode}</td>
				<td>${classSchedule.branch || "-"}</td>
				<td>${this.#services.utils.getSchedulesAsString(classSchedule.schedules)}</td>
				<td><ul class="no-margin">${professorLis}</ul></td>
			</tr>`;
		}).join("");
		this.#coursesResultDiv.insertAdjacentHTML("beforeend", `
			<h3>Cursos en los que estuvo presente en los últimos 3 años (incluyendo el actual)</h3>
			<table>
				<tbody>
					<tr><th colspan="2">Cuatr.</th><th>Materia</th><th>Curso</th><th>Anexo</th><th>Horario</th><th>Profesores</th></tr>
					${trs}
				</tbody>
			</table>
		`);
		this.#coursesResultDiv.insertAdjacentHTML("beforeend", `<hr>`);
		this.#coursesResultDiv.style.display = "";
	}

	async #retrieveSurveyResults(professorName) {
		this.#surveyResultDiv.style.display = "none";
		let response = await this.#services.apiConnector.getProfessorSurveysAggregate(professorName);
		this.#surveyResultDiv.innerHTML = "";
		Object.entries(response)
			// Put DOCENTE before AUXILIAR
			.sort((a, b) => (a[0] > b[0] ? -1 : 1))
			.forEach(entry => this.#appendSurveyResults(entry[0], entry[1]));
		this.#surveyResultDiv.style.display = "";
	}

	#appendSurveyResults(surveyKind, results) {
		this.#surveyResultDiv.insertAdjacentHTML("beforeend", `<h3>Encuesta de tipo ${surveyKind}</h3>`);

		if (results.historicalScores && Object.keys(results.historicalScores).length) {
			let canvasId = `historical-score-${surveyKind}`;

			this.#surveyResultDiv.insertAdjacentHTML("beforeend", `
				<div class="historical-score-chart"><canvas id="${canvasId}"></canvas></div>
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
									chart.ctx.fillStyle = this.#services.utils.getColorForAvg(rule.from, 0.1);
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
				return `<tr><td>${item.question}</td><td style="background-color: ${this.#services.utils.getColorForAvg(item.average)}">${item.average}</td><td>${item.count}</td></tr>`;
			}).join("");
			this.#surveyResultDiv.insertAdjacentHTML("beforeend", `
				<h4>Puntajes</h4>
				<div class="overall-score">General: ${this.#services.utils.getOverallScoreSpan(results.overallScore)}</div>
				<table class="percentage-questions">
					<tbody>
						<tr><th>Pregunta</th><th>Promedio</th><th>Muestra</th></tr>
						${percentageRows}
					</tbody>
				</table>
			`);
		}

		if (results.textFieldGroups.length) {
			// First collect all question sentiments to create a header
			let questionsBySentiment = {};
			results.textFieldGroups.forEach(group => {
				questionsBySentiment[group.sentiment] = group.question;
			});
			let sentimentsSorted = Object.keys(questionsBySentiment).sort().reverse();
			let textHeaderColumns = sentimentsSorted.map(sentiment => {
				return `<th>${questionsBySentiment[sentiment]}</th>`;
			}).join("");

			// Now for each group create rows:
			let answersByGroup = {};
			results.textFieldGroups.forEach(group => {
				let key = `${group.year} ${group.quarter} - ${group.courseName} (${group.courseCode})`;
				if (!answersByGroup[key]) answersByGroup[key] = {};
				answersByGroup[key][group.sentiment] = group.values;
			});

			let textValueRows = Object.keys(answersByGroup).sort().reverse().map(groupKey => {
				let textValueColumns = sentimentsSorted.map(sentiment => {
					let values = answersByGroup[groupKey][sentiment] || [];
					let answers = values.map(answer => `<i>"${answer}"</i>`).join(`<hr>`);
					return `<td style="color: ${SENTIMENT_COLORS[sentiment]}">${answers}</td>`;
				}).join("");

				return `
					<tr><td class="group-key" colspan="${sentimentsSorted.length}">${groupKey}</td></tr>
					<tr>${textValueColumns}</tr>
				`;
			}).join("");

			this.#surveyResultDiv.insertAdjacentHTML("beforeend", `
				<h4>Comentarios</h4>
				<table class="text-questions">
					<tbody>
						<tr>${textHeaderColumns}</tr>
						${textValueRows}
					</tbody>
				</table>
			`);
		}
		this.#surveyResultDiv.insertAdjacentHTML("beforeend", `<hr>`);
	}

	async init() {
		this.#createPage();
		let professorName = new URLSearchParams(window.location.search).get(ProfessorsSearchCustomPage.customParamKey);
		if (professorName) {
			return this.#retrieveProfessorData(professorName);
		}
	}

	close() {
	}
}
