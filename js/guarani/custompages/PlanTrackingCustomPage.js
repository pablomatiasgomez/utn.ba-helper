let PlanTrackingCustomPage = function ($container, services) {

	const TRANSLATIONS = {
		"SIGNED": "Firmada",
		"PASSED": "Aprobada",
		"REGISTER": "Cursar",
		"TAKE_FINAL_EXAM": "Rendir final",
	};

	let $plan;

	let createPage = function (planCode, passedCourses) {
		$plan = $("<div></div>");
		$container.append($plan);
		loadPlan(planCode, passedCourses);
	};

	let loadPlan = function (planCode, passedCourses) {
		if (!planCode) return;
		return services.apiConnector.getPlanCourses(planCode).then(planCourses => {
			return loadPlanCourses(planCode, planCourses, passedCourses);
		});
	};

	let loadPlanCourses = function (planCode, planCourses, passedCourses) {
		let courseNamesByCode = planCourses.reduce(function (courseNamesByCode, course) {
			courseNamesByCode[course.courseCode] = course.courseName;
			return courseNamesByCode;
		}, {});

		let courseRequirementToArray = {
			// We will always use the last 4 chars, removing the first 2 that identify the specific plan.
			// This is done in order to connect passed courses that are transitive from a previous plan.
			// For example, a student passed 952021 (K95), which is 082021 (K08) in the new plan.
			"SIGNED": passedCourses.signed.map(courseCode => courseCode.substring(2)),
			"PASSED": passedCourses.passed.map(courseCode => courseCode.substring(2)),
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
						<a href="" onclick="return false" style="float: right;">
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
						<div class="text-medium">${course.courseName}</div>
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
			<h3>Plan ${planCode}</h3>
			<table class="plan-tracking table table-bordered table-condensed table-hover">
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
			services.pagesDataParser.getPassedCourses(),
		]);
	}).then(result => {
		let planCode = result[0];
		let passedCourses = result[1];
		return createPage(planCode, passedCourses);
	});
};

PlanTrackingCustomPage.menuName = "Seguimiento de Plan";
PlanTrackingCustomPage.customParamKey = "";
