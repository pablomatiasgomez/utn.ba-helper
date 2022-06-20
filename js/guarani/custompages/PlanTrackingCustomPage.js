if (!window.UtnBaHelper) window.UtnBaHelper = {};
UtnBaHelper.PlanTrackingCustomPage = function ($container, services) {

	const TRANSLATIONS = {
		"SIGNED": "Firmada",
		"PASSED": "Aprobada",
		"REGISTER": "Cursar",
		"TAKE_FINAL_EXAM": "Rendir final",
	};

	let $gradesSummary;
	let $plan;

	let createPage = function (planCode, coursesHistory) {
		let promises = [];

		$container.append(`<h3>Plan ${planCode}</h3>`);

		$gradesSummary = $("<div></div>");
		$container.append($gradesSummary);
		promises.push(buildGradesSummary(coursesHistory));

		$container.append("<hr>");

		$plan = $("<div></div>");
		$container.append($plan);
		promises.push(loadPlan(planCode, coursesHistory));

		return Promise.all(promises);
	};

	let buildGradesSummary = function (coursesHistory) {
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

		$gradesSummary.html(`<table><tbody></tbody></table>(*) La nota ponderada es calculada por el "UTN.BA Helper" segun Ordenanza Nº 1549`);
		const appendTableRow = (description, value) => $gradesSummary.find("tbody").append("<tr><td>" + description + "</td><td><b>" + (value || value === 0 ? value : "n/a") + "</b></td></tr>");

		appendTableRow("Peso academico", `${pesoAcademico} <small>(11*${passedFinalExams.length} - 5*${yearsCount} - 3*${failedFinalExams.length})</small>`);
		appendTableRow("Cantidad de finales aprobados", passedFinalExams.length);
		appendTableRow("Cantidad de finales desaprobados", failedFinalExams.length);
		appendTableRow("Promedio de notas ponderadas <sup>(*)</sup> con desaprobados", allWeightedGradesAverage);
		appendTableRow("Promedio de notas ponderadas <sup>(*)</sup> sin desaprobados", passedWeightedGradesAverage);
		appendTableRow("Promedio de notas originales <sup>(*)</sup> con desaprobados", allNonWeightedGradesAverage);
		appendTableRow("Promedio de notas originales <sup>(*)</sup> sin desaprobados", passedNonWeightedGradesAverage);

		return services.dataCollector.logUserStat(pesoAcademico, passedWeightedGradesAverage, allWeightedGradesAverage, passedFinalExams.length, failedFinalExams.length);
	};

	//...

	let loadPlan = function (planCode, coursesHistory) {
		if (!planCode) return;
		return services.apiConnector.getPlanCourses(planCode).then(planCourses => {
			return loadPlanCourses(planCode, planCourses, coursesHistory);
		});
	};

	let loadPlanCourses = function (planCode, planCourses, coursesHistory) {
		let courseNamesByCode = planCourses.reduce(function (courseNamesByCode, course) {
			courseNamesByCode[course.courseCode] = course.courseName;
			return courseNamesByCode;
		}, {});

		// For signed courses we consider both passed and signed, and remove duplicates.
		let passedCourses = coursesHistory.finalExams.filter(course => course.isPassed).map(course => course.courseCode);
		let signedCourses = [...new Set([...passedCourses, ...coursesHistory.courses.filter(course => course.isPassed).map(course => course.courseCode)])];
		let courseRequirementToArray = {
			// We will always use the last 4 chars, removing the first 2 that identify the specific plan.
			// This is done in order to connect passed courses that are transitive from a previous plan.
			// For example, a student passed 952021 (K95), which is 082021 (K08) in the new plan.
			"SIGNED": signedCourses.map(courseCode => courseCode.substring(2)),
			"PASSED": passedCourses.map(courseCode => courseCode.substring(2)),
		};
		let hasCourse = (requirement, courseCode) => courseRequirementToArray[requirement].indexOf(courseCode.substring(2)) !== -1;

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
				let color = "#7e7e7e";
				if (course.isPassed) {
					status = TRANSLATIONS["PASSED"];
					color = "#55bb55";
				} else if (course.canTakeFinalExam) {
					status = "Puede " + TRANSLATIONS["TAKE_FINAL_EXAM"].toLowerCase();
					color = "#ffcc00";
				} else if (course.isSigned) {
					status = TRANSLATIONS["SIGNED"];
					color = "#ffcc00";
				} else if (course.canRegister) {
					status = "Puede " + TRANSLATIONS["REGISTER"].toLowerCase();
					color = "#5555bb";
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
					<div class="course level-${level} ${divClass}" style="background-color:${color};">
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
						<div class="text-medium">${course.courseName}<a class="no-ajax" href="${UtnBaHelper.CustomPages.getCourseResultsUrl(course.courseCode)}" target="_blank">&#x2197;</a></div>
					</div>`;
			}).join("");
		};

		let levels = [...new Set(planCourses
			.filter(course => course.level !== 0)
			.map(course => course.level))]
			.sort();

		let ths = levels.map(level => `<th>Nivel ${level}</th>`).join("");
		let tds = levels.map(level => `<td>${getCoursesHtml(level)}</td>`).join("");
		$plan.html(`
			<table class="plan-tracking">
				<tbody>
					<tr>${ths}</tr>
					<tr>${tds}</tr>
				</tbody>
			</table>
		`);

		$plan.find("table").on("click", ".show-electives", function () {
			let level = $(this).attr("data-level");
			$plan.find(`table .course.level-${level}`).removeClass("hidden");
			$(this).remove();
			return false;
		});
	};

	// Init
	return Promise.resolve().then(() => {
		return Promise.all([
			services.pagesDataParser.getStudentPlanCode(),
			services.pagesDataParser.getCoursesHistory(),
		]);
	}).then(result => {
		let planCode = result[0];
		let coursesHistory = result[1];
		return createPage(planCode, coursesHistory);
	});
};

UtnBaHelper.PlanTrackingCustomPage.menuName = "Seguimiento de Plan";
UtnBaHelper.PlanTrackingCustomPage.customParamKey = "";
