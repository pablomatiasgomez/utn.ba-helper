import './PlanTrackingCustomPage.css';

import {CustomPages} from './CustomPages.js';
import {getCicloLectivo} from '../CicloLectivo.js';

const TRANSLATIONS = {
	"SIGNED": "Firmada",
	"PASSED": "Aprobada",
	"REGISTER": "Cursar",
	"TAKE_FINAL_EXAM": "Rendir final",
};

export class PlanTrackingCustomPage {
	static menuName = "Seguimiento de Plan";
	static customParamKey = "";

	#container;
	#services;
	#gradesSummaryDiv;
	#planDiv;

	constructor(container, services) {
		this.#container = container;
		this.#services = services;
	}

	#createPage(planCode, coursesHistory) {
		let promises = [];

		this.#container.insertAdjacentHTML("beforeend", `<h3>Plan ${planCode}</h3>`);

		this.#gradesSummaryDiv = document.createElement("div");
		this.#container.appendChild(this.#gradesSummaryDiv);
		promises.push(this.#buildGradesSummary(coursesHistory));

		this.#container.insertAdjacentHTML("beforeend", "<hr>");

		this.#planDiv = document.createElement("div");
		this.#container.appendChild(this.#planDiv);
		promises.push(this.#loadPlan(planCode, coursesHistory));

		return Promise.all(promises);
	}

	#buildGradesSummary(coursesHistory) {
		let startYear = coursesHistory.courses.concat(coursesHistory.finalExams)
			.map(course => course.date)
			.sort((a, b) => a - b)
			.map(date => date.getFullYear())
			[0];
		if (!startYear) return; // If no courses nor finalExams, there is nothing we can show.
		let yearsCount = (new Date().getFullYear() - startYear + 1);

		const arrayAverage = arr => Math.round(arr.reduce((a, b) => a + b, 0) / arr.length * 100) / 100;

		let passedFinalExams = coursesHistory.finalExams.filter(course => course.isPassed);
		let failedFinalExams = coursesHistory.finalExams.filter(course => !course.isPassed);
		let pesoAcademico = 11 * passedFinalExams.length - 5 * yearsCount - 3 * failedFinalExams.length;

		// Nuevo polinomio desde CL2027
		//   P = 11*MAp_total - 7*FAd_total - 19*FAu_ciclo - 17*MAb_ciclo + 5*MR_ciclo
		let passedCourseCodes = new Set(passedFinalExams.map(c => c.courseCode));
		let signedCourseCodes = new Set(coursesHistory.courses.filter(c => c.isPassed).map(c => c.courseCode));
		let ultimoCiclo = getCicloLectivo(new Date());
		let isInUltimoCiclo = course => getCicloLectivo(course.date) === ultimoCiclo;

		let mApTotal = passedFinalExams.length;
		let fAdTotal = [...signedCourseCodes].filter(code => !passedCourseCodes.has(code)).length;
		let fAuCiclo = coursesHistory.finalExams.filter(c => c.isAbsent && isInUltimoCiclo(c)).length;
		let mAbCiclo = coursesHistory.courses.filter(c => c.isAbsent && isInUltimoCiclo(c)).length;
		let mRCiclo = coursesHistory.courses.filter(c => c.isPassed && isInUltimoCiclo(c)).length;
		let pesoAcademicoCL2027 = 11 * mApTotal - 7 * fAdTotal - 19 * fAuCiclo - 17 * mAbCiclo + 5 * mRCiclo;

		// Some final exams do not have grade (e.g. "Equivalencia Total") so we ignore them for the average.
		let passedWeightedGrades = passedFinalExams.filter(course => typeof course.weightedGrade === "number").map(course => course.weightedGrade);
		let failedWeightedGrades = failedFinalExams.filter(course => typeof course.weightedGrade === "number").map(course => course.weightedGrade);
		let passedNonWeightedGrades = passedFinalExams.filter(course => typeof course.grade === "number").map(course => course.grade);
		let failedNonWeightedGrades = failedFinalExams.filter(course => typeof course.grade === "number").map(course => course.grade);

		let allWeightedGradesAverage = arrayAverage(passedWeightedGrades.concat(failedWeightedGrades));
		let passedWeightedGradesAverage = arrayAverage(passedWeightedGrades);
		let allNonWeightedGradesAverage = arrayAverage(passedNonWeightedGrades.concat(failedNonWeightedGrades));
		let passedNonWeightedGradesAverage = arrayAverage(passedNonWeightedGrades);

		this.#gradesSummaryDiv.innerHTML = `<table><tbody></tbody></table>
				<div class="grades-summary-notes">
					<div class="footnote"><sup>a</sup> Peso académico (hasta CL2026): Materias Aprobadas * 11 - años de carrera * 5 - finales desaprobados * 3</div>
					<div class="footnote">
						<sup>b</sup> Peso académico (desde CL2027): 11 * MAp_total - 7 * FAd_total - 19 * FAu_ciclo - 17 * MAb_ciclo + 5 * MR_ciclo.<br>
						Calculado según <a href="https://drive.google.com/file/d/1JgPpygNPqBlHwwuYtwX7a7Qq0oWrKwXs/view" target="_blank">resolución 2902/25</a>, considerando ciclo lectivo ${ultimoCiclo} como "último ciclo", donde:
						<ul>
							<li><b>MAp_total</b>: cantidad total de materias aprobadas (con final, promocionadas o acreditadas) desde el inicio de la actividad académica.</li>
							<li><b>FAd_total</b>: cantidad de finales adeudados desde el inicio de la actividad académica.</li>
							<li><b>FAu_ciclo</b>: cantidad de finales ausentes en el último ciclo lectivo (se inscribe a una mesa de final, no se presenta y no se da de baja durante el período de preinscripción del turno).</li>
							<li><b>MAb_ciclo</b>: cantidad de materias abandonadas en el último ciclo lectivo. Se considera abandonada cuando no se presentó al menos a 1 de las instancias (inicial o recuperatorios) de cada evaluación prevista por la cátedra.</li>
							<li><b>MR_ciclo</b>: cantidad de materias regularizadas en el último ciclo lectivo.</li>
						</ul>
					</div>
					<div class="footnote"><sup>c</sup> La nota ponderada es calculada por el "UTN.BA Helper" según <a href="https://www.frba.utn.edu.ar/wp-content/uploads/2019/09/ordenanza_1549.pdf" target="_blank">Ordenanza Nº 1549</a>.</div>
				</div>`;
		const tbody = this.#gradesSummaryDiv.querySelector("tbody");
		const appendTableRow = (description, value) => tbody.insertAdjacentHTML("beforeend", "<tr><td>" + description + "</td><td><b>" + (value || value === 0 ? value : "n/a") + "</b></td></tr>");

		appendTableRow("Peso académico (hasta CL2026)", `${pesoAcademico} <small>(11*${passedFinalExams.length} - 5*${yearsCount} - 3*${failedFinalExams.length})</small> <sup>a</sup>`);
		appendTableRow("Peso académico (desde CL2027)", `${pesoAcademicoCL2027} <small>(11*${mApTotal} - 7*${fAdTotal} - 19*${fAuCiclo} - 17*${mAbCiclo} + 5*${mRCiclo})</small> <sup>b</sup>`);
		appendTableRow("Cantidad de materias aprobadas", passedFinalExams.length);
		appendTableRow("Cantidad de finales desaprobados", failedFinalExams.length);
		appendTableRow("Promedio de notas ponderadas<sup>c</sup> con desaprobados", allWeightedGradesAverage);
		appendTableRow("Promedio de notas ponderadas<sup>c</sup> sin desaprobados", passedWeightedGradesAverage);
		appendTableRow("Promedio de notas originales<sup>c</sup> con desaprobados", allNonWeightedGradesAverage);
		appendTableRow("Promedio de notas originales<sup>c</sup> sin desaprobados", passedNonWeightedGradesAverage);

		return this.#services.dataCollector.logUserStat(pesoAcademico, pesoAcademicoCL2027, passedWeightedGradesAverage, allWeightedGradesAverage, passedFinalExams.length, failedFinalExams.length);
	}

	//...

	async #loadPlan(planCode, coursesHistory) {
		if (!planCode) return;
		let planCourses = await this.#services.apiConnector.getPlanCourses(planCode);
		return this.#loadPlanCourses(planCourses, coursesHistory);
	}

	#loadPlanCourses(planCourses, coursesHistory) {
		let courseNamesByCode = planCourses.reduce(function (courseNamesByCode, course) {
			courseNamesByCode[course.courseCode] = course.courseName;
			return courseNamesByCode;
		}, {});

		// For signed courses we consider both passed and signed, and remove duplicates.
		let passedCourses = coursesHistory.finalExams.filter(course => course.isPassed).map(course => course.courseCode);
		let signedCourses = [...new Set([...passedCourses, ...coursesHistory.courses.filter(course => course.isPassed).map(course => course.courseCode)])];
		let inProgressCourses = coursesHistory.courses.filter(course => course.isInProgress).map(course => course.courseCode);
		let courseRequirementToArray = {
			"SIGNED": signedCourses,
			"PASSED": passedCourses,
		};
		let hasCourse = (requirement, courseCode) => courseRequirementToArray[requirement].includes(courseCode);

		let getCoursesHtml = level => {
			let lastWasElective = false;
			let showExtraElectivesButtonAdded = false;
			return planCourses.filter(course => {
				return course.level === level;
			}).map(course => {
				let meetsDependencies = kind => course.dependencies
					.filter(dependency => dependency.kind === kind)
					.every(dependency => hasCourse(dependency.requirement, dependency.courseCode));
				course.isSigned = hasCourse("SIGNED", course.courseCode);
				course.isPassed = hasCourse("PASSED", course.courseCode);
				course.isInProgress = inProgressCourses.includes(course.courseCode);
				course.canRegister = meetsDependencies("REGISTER");
				course.canTakeFinalExam = meetsDependencies("TAKE_FINAL_EXAM");
				return course;
			}).sort((c1, c2) => {
				let courseWeight = course => {
					let w;
					if (course.isPassed) w = 10;
					else if (course.isInProgress) w = 9;
					else if (course.canTakeFinalExam) w = 8;
					else if (course.isSigned) w = 7;
					else if (course.canRegister) w = 6;
					else w = 5;
					if (course.elective) {
						w -= 5;
					}
					return w;
				};
				return courseWeight(c2) - courseWeight(c1);
			}).map(course => {
				let status;
				let backgroundColor = "#7e7e7e";
				let color = "#000000";
				if (course.isPassed) {
					status = TRANSLATIONS["PASSED"];
					backgroundColor = "#55bb55";
				} else if (course.isInProgress) {
					status = "Cursando";
					backgroundColor = "#ff8c42";
				} else if (course.canTakeFinalExam) {
					status = "Puede " + TRANSLATIONS["TAKE_FINAL_EXAM"].toLowerCase();
					backgroundColor = "#ffcc00";
				} else if (course.isSigned) {
					status = TRANSLATIONS["SIGNED"];
					backgroundColor = "#ffcc00";
				} else if (course.canRegister) {
					status = "Puede " + TRANSLATIONS["REGISTER"].toLowerCase();
					backgroundColor = "#5555bb";
					color = "#f1f1f1";
				}

				let hr = "";
				if (!lastWasElective && course.elective) {
					lastWasElective = true;
					hr = `<hr><div>Electivas:</div>`;
				}

				let divClass = "";
				let showExtraElectivesButton = "";
				if (course.elective && !course.isPassed && !course.isInProgress && !course.canTakeFinalExam && !course.isSigned) {
					divClass = "hidden";
					if (!showExtraElectivesButtonAdded) {
						showExtraElectivesButtonAdded = true;
						showExtraElectivesButton = `<a href="#" class="show-electives" data-level="${level}">> Mostrar todas</a>`;
					}
				}

				let getDependenciesLines = dependencyKind => course.dependencies
					.filter(dependency => dependency.kind === dependencyKind)
					.map(dependency => {
						let line = `${TRANSLATIONS[dependency.requirement]} [${dependency.courseCode}] ${courseNamesByCode[dependency.courseCode] || ""}`;
						if (hasCourse(dependency.requirement, dependency.courseCode)) line = `<s>${line}</s>`;
						return line;
					})
					.join("<br>");

				return `
					${hr}
					${showExtraElectivesButton}
					<div class="course level-${level} ${divClass}" style="background-color:${backgroundColor};color:${color}">
						<a href="#" onclick="return false" style="float: right;">
							<i class="icon-info-sign"></i>
							<span class="dependency-tooltip">
								<u>Para ${TRANSLATIONS["REGISTER"].toLowerCase()}</u>:<br>
								${getDependenciesLines("REGISTER")}
								<br><br>
								<u>Para ${TRANSLATIONS["TAKE_FINAL_EXAM"].toLowerCase()}</u>:<br>
								${getDependenciesLines("TAKE_FINAL_EXAM")}
							</span>
						</a>
						<div class="text-small">[${course.courseCode}] ${status ? " - " + status : ""}</div>
						<div class="text-medium">${course.courseName}<a class="no-ajax" href="${CustomPages.getCourseResultsUrl(course.courseCode)}" target="_blank">&#x2197;</a></div>
					</div>`;
			}).join("");
		};

		let levels = [...new Set(planCourses
			.filter(course => course.level !== 0) // TODO this should be removed if we update courses...
			.map(course => course.level))]
			.sort();

		let ths = levels.map(level => `<th>Nivel ${level}</th>`).join("");
		let tds = levels.map(level => `<td>${getCoursesHtml(level)}</td>`).join("");
		this.#planDiv.innerHTML = `
			<table class="plan-tracking">
				<tbody>
					<tr>${ths}</tr>
					<tr>${tds}</tr>
				</tbody>
			</table>
		`;

		this.#planDiv.querySelectorAll("table .show-electives").forEach(element => {
			element.addEventListener("click", e => {
				let level = element.getAttribute("data-level");
				this.#planDiv.querySelectorAll(`table .course.level-${level}`).forEach(el => el.classList.remove("hidden"));
				element.remove(); // TODO eventually we could allow hiding again the electives.
				e.preventDefault();
			});
		});
	}

	async init() {
		let [planCode, coursesHistory] = await Promise.all([
			this.#services.pagesDataParser.getStudentPlanCode(),
			this.#services.pagesDataParser.getCoursesHistory(),
		]);
		return this.#createPage(planCode, coursesHistory);
	}

	close() {
	}
}
