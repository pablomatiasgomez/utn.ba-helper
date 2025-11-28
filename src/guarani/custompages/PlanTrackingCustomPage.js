import $ from 'jquery';
import {CustomPages} from './CustomPages.js';

const TRANSLATIONS = {
	"SIGNED": "Firmada",
	"PASSED": "Aprobada",
	"REGISTER": "Cursar",
	"TAKE_FINAL_EXAM": "Rendir final",
};

export class PlanTrackingCustomPage {
	static menuName = "Seguimiento de Plan";
	static customParamKey = "";

	#$container;
	#services;
	#$gradesSummary;
	#planDiv;

	constructor(container, services) {
		this.#$container = $(container);
		this.#services = services;
	}

	#createPage(planCode, coursesHistory) {
		let promises = [];

		this.#$container.append(`<h3>Plan ${planCode}</h3>`);

		this.#$gradesSummary = $("<div></div>");
		this.#$container.append(this.#$gradesSummary);
		promises.push(this.#buildGradesSummary(coursesHistory));

		this.#$container.append("<hr>");

		this.#planDiv = document.createElement('div');
		this.#$container.append(this.#planDiv);
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

		// Some final exams do not have grade (e.g. "Equivalencia Total") so we ignore them for the average.
		let passedWeightedGrades = passedFinalExams.filter(course => typeof course.weightedGrade === "number").map(course => course.weightedGrade);
		let failedWeightedGrades = failedFinalExams.filter(course => typeof course.weightedGrade === "number").map(course => course.weightedGrade);
		let passedNonWeightedGrades = passedFinalExams.filter(course => typeof course.grade === "number").map(course => course.grade);
		let failedNonWeightedGrades = failedFinalExams.filter(course => typeof course.grade === "number").map(course => course.grade);

		let allWeightedGradesAverage = arrayAverage(passedWeightedGrades.concat(failedWeightedGrades));
		let passedWeightedGradesAverage = arrayAverage(passedWeightedGrades);
		let allNonWeightedGradesAverage = arrayAverage(passedNonWeightedGrades.concat(failedNonWeightedGrades));
		let passedNonWeightedGradesAverage = arrayAverage(passedNonWeightedGrades);

		this.#$gradesSummary.html(`<table><tbody></tbody></table>
				<i><span><sup>a</sup> Peso académico: Materias Aprobadas * 11 - años de carrera * 5 - finales desaprobados * 3</span></br>
				<span><sup>b</sup> La nota ponderada es calculada por el "UTN.BA Helper" según <a href="https://www.frba.utn.edu.ar/wp-content/uploads/2019/09/ordenanza_1549.pdf" target="_blank">Ordenanza Nº 1549</a></span></i>`);
		const appendTableRow = (description, value) => this.#$gradesSummary.find("tbody").append("<tr><td>" + description + "</td><td><b>" + (value || value === 0 ? value : "n/a") + "</b></td></tr>");

		appendTableRow("Peso academico", `${pesoAcademico} <small>(11*${passedFinalExams.length} - 5*${yearsCount} - 3*${failedFinalExams.length})</small> <sup>a</sup>`);
		appendTableRow("Cantidad de finales aprobados", passedFinalExams.length);
		appendTableRow("Cantidad de finales desaprobados", failedFinalExams.length);
		appendTableRow("Promedio de notas ponderadas<sup>b</sup> con desaprobados", allWeightedGradesAverage);
		appendTableRow("Promedio de notas ponderadas<sup>b</sup> sin desaprobados", passedWeightedGradesAverage);
		appendTableRow("Promedio de notas originales<sup>b</sup> con desaprobados", allNonWeightedGradesAverage);
		appendTableRow("Promedio de notas originales<sup>b</sup> sin desaprobados", passedNonWeightedGradesAverage);

		return this.#services.dataCollector.logUserStat(pesoAcademico, passedWeightedGradesAverage, allWeightedGradesAverage, passedFinalExams.length, failedFinalExams.length);
	}

	//...

	#loadPlan(planCode, coursesHistory) {
		if (!planCode) return;
		return this.#services.apiConnector.getPlanCourses(planCode).then(planCourses => {
			return this.#loadPlanCourses(planCourses, coursesHistory);
		});
	}

	#loadPlanCourses(planCourses, coursesHistory) {
		let courseNamesByCode = planCourses.reduce(function (courseNamesByCode, course) {
			courseNamesByCode[course.courseCode] = course.courseName;
			return courseNamesByCode;
		}, {});

		// For signed courses we consider both passed and signed, and remove duplicates.
		let passedCourses = coursesHistory.finalExams.filter(course => course.isPassed).map(course => course.courseCode);
		let signedCourses = [...new Set([...passedCourses, ...coursesHistory.courses.filter(course => course.isPassed).map(course => course.courseCode)])];
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
				course.canRegister = meetsDependencies("REGISTER");
				course.canTakeFinalExam = meetsDependencies("TAKE_FINAL_EXAM");
				return course;
			}).sort((c1, c2) => {
				let courseWeight = course => {
					let w;
					if (course.isPassed) w = 10;
					else if (course.canTakeFinalExam) w = 9;
					else if (course.isSigned) w = 8;
					else if (course.canRegister) w = 7;
					else w = 6;
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
				if (course.elective && !course.isPassed && !course.canTakeFinalExam && !course.isSigned) {
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

	init() {
		return Promise.resolve().then(() => {
			return Promise.all([
				this.#services.pagesDataParser.getStudentPlanCode(),
				this.#services.pagesDataParser.getCoursesHistory(),
			]);
		}).then(result => {
			let planCode = result[0];
			let coursesHistory = result[1];
			return this.#createPage(planCode, coursesHistory);
		});
	}

	close() {
	}
}
