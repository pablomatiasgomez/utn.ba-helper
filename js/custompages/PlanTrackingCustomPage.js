let PlanTrackingCustomPage = function ($container, services) {

	let $plan;

	let createPage = function (planCodes, passedCourses) {
		let $planSelect = $(`<select><option>Seleccionar plan</option></select>`);
		planCodes.forEach(planCode => $planSelect.append(`<option value="${planCode}">${planCode}</option>`));
		$planSelect.on("change", function () {
			loadPlan($planSelect.val(), passedCourses);
			return false;
		});

		$container.append($(`<div>Plan de estudios </div>`).append($planSelect));
		$container.append("<hr>");

		$plan = $("<div></div>");
		$container.append($plan);
	};

	let loadPlan = function (planCode, passedCourses) {
		if (!planCode) return;
		return services.apiConnector.getPlanCourses(planCode).then(planCourses => {
			return loadPlanCourses(planCode, planCourses, passedCourses);
		});
	};

	let loadPlanCourses = function (planCode, planCourses, passedCourses) {
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
					status = "Aprobada";
					color = "#55bb55";
				} else if (course.canTakeFinalExam) {
					status = "Puede rendir final";
					color = "#ffcc00";
				} else if (course.isSigned) {
					status = "Firmada";
					color = "#ffcc00";
				} else if (course.canRegister) {
					status = "Puede cursar";
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
				return `
					${hr}
					${showExtraElectivesButton}
					<div class="course level-${level} ${divClass}" style="background-color:${color};">
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
			<p>Plan ${planCode}</p>
			<table class="siga-helper-plan">
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
			services.pagesDataParser.getStudentPlans(),
			services.pagesDataParser.getPassedCourses(),
		]);
	}).then(result => {
		let planCodes = result[0].map(plan => plan.planCode);
		let passedCourses = result[1];
		return createPage(planCodes, passedCourses);
	});
};

PlanTrackingCustomPage.menuName = "Seguimiento de Plan";
PlanTrackingCustomPage.customParamKey = "";
