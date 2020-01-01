let PagesDataParser = function (apiConnector) {

	let trackError = function (error, methodName) {
		console.error(error);
		return apiConnector.logError(methodName, error);
	};

	let getPageContents = function (url) {
		return $.ajax(url);
	};

	/**
	 * Tries to resolve the starting year in the university for the current student.
	 * @return {Promise<String>}
	 */
	let getStartYear = function () {
		return getPageContents("/alu/libreta.do").then(responseText => {
			let startDate = $(responseText).find(".std-canvas table:first tbody tr:last td:first").text();
			return startDate.split("/")[2];
		}).catch(e => {
			trackError(e, "getStartYear");
			return null;
		});
	};

	/**
	 * Tries to resolve and return the student id for the current logged in user.
	 * @return {Promise<String>}
	 */
	let getStudentId = function () {
		return getPageContents("/alu/inscurcomp.do").then(responseText => {
			let studentId = $(responseText).find("div.center p.mask1 span").text();
			if (!studentId) throw "Couldn't get studentId from responseText: " + responseText;
			return studentId;
		}).catch(e => {
			trackError(e, "getStudentId");
			throw e;
		});
	};

	/**
	 * Gets all the courses that the student has taken, not including the failed ones.
	 * The returned object contains the signed courses, which does not include the passed ones. The passed courses are included in a different proeprty.
	 * @return {Promise<{signed: Array<String>, passed: Array<String>}>}
	 */
	let getCourses = function () {
		let getCoursesFromPage = page => {
			return getPageContents(page).then(responseText => {
				return $(responseText).find(".std-canvas table:first tbody tr:not(:first)")
					.map((i, elem) => $(elem).find("td:eq(1)").text())
					.toArray();
			});
		};

		return Promise.all([
			getCoursesFromPage("/alu/acfin.do"),
			getCoursesFromPage("/alu/actp.do")
		]).then(results => {
			let passedCourses = results[0];
			let signedCourses = results[1].filter(course => passedCourses.indexOf(course) === -1);
			return {
				passed: passedCourses,
				signed: signedCourses
			};
		}).catch(e => {
			trackError(e, "getCourses");
			throw e;
		});
	};

	const TYPE_REGEX_PARSER = /^(docente|auxiliares) (\d{4}) (a|1|2)(nual|er c|do c)$/g;

	/**
	 * Fetches all the current surveys that the user has to take o has taken.
	 * For each of them resolves the current professor name, class, course, quarter, etc.
	 * @return an array of objects for each combination of professor and class
	 */
	let getProfessorClassesFromSurveys = function () {
		return getPageContents("/alu/encdoc.do").then(responseText => {
			return $(responseText).find(".std-canvas .tab")
				.toArray()
				.flatMap(elem => {
					let typeStr = $(elem).prevAll("p").first().text().toLowerCase().replace("encuesta", "").replace("_", " ").trim();
					let groups = TYPE_REGEX_PARSER.exec(typeStr);
					if (!groups || groups.length !== 5) throw "Type couldn't be parsed: " + typeStr;

					let surveyKind = groups[1].toUpperCase(); // DOCENTE, AUXILIARES
					let year = parseInt(groups[2]); // 2018, 2019, ...
					let quarter = groups[3] === "a" ? "A" : (groups[3] + "C"); // A, 1C, 2C

					let classTaken = $(elem).find("p").text().split(" ");
					let classCode = classTaken[0];
					let courseCode = classTaken[1];
					return $(elem).find("table tr")
						.toArray()
						.map(elem => {
							// For each professor we return an object with the same class & course
							let professorName = $(elem).find("td:first").text();
							let professorRole = $(elem).find("td:eq(1)").text();
							return {
								surveyKind: surveyKind,
								year: year,
								quarter: quarter,
								classCode: classCode,
								courseCode: courseCode,
								professorName: professorName,
								professorRole: professorRole
							};
						});
				});
		}).catch(e => {
			trackError(e, "getProfessorClassesFromSurveys");
			throw e;
		});
	};

	/*
	let getSentSurveys = function () {
		return getPageContents("/alu/encdoc.do").then(responseText => {
			return $(responseText).find(".std-canvas .tab")
				.toArray()
				.flatMap(elem => {
					let course = $(elem).find("p").text().split(" ");
					let time = $(elem).prevAll("p").first().text().replace("_Encuesta", "").trim();
					let classCode = course[0];
					let courseCode = course[1];
					return $(elem).find("table tr")
						.toArray()
						.filter(elem => {
							let isCompleted = $(elem).find("td:eq(4) img").length > 0;
							return isCompleted;
						})
						.map(elem => {
							// onclick string is something like this:
							// "if(fn_encuesta(51,36218,52143,'Z3574 [950309] Economía','[JEFE DE TP] GALLONI GUILLEN, ROLANDO')){return jslib_submit(null,'/alu/encdocpop.do','popup',null,false );} else return false;";
							// fn_encuesta function are like this:
							// function fn_encuesta(form_iden,form_idcu,form_iddo,form_curnom,form_docnom){
							let jsOnClick = $(elem).find("td:eq(3) a").attr("onclick");

							// 3 int params, and 2 string params.
							let FN_ENCUESTA_ONCLICK_REGEX = /^if\(fn_encuesta\((\d+)\,(\d+)\,(\d+)\,\'(.*)\'\,\'(.*)\'\)\){return\ jslib_submit/;
							let match = FN_ENCUESTA_ONCLICK_REGEX.exec(jsOnClick);
							let form_iden = parseInt(match[1]);
							let form_idcu = parseInt(match[2]);
							let form_iddo = parseInt(match[3]);
							let form_curnom = match[4];
							let form_docnom = match[5];

							$.ajax({
								method: "POST",
								url: "/alu/encdocpop.do",
								data: {
									form_submit: 0,
									form_iden: form_iden,
									form_idcu: form_idcu,
									form_iddo: form_iddo,
									form_curnom: form_curnom,
									form_docnom: form_docnom
								}
							}).then(responseText => {
								let values = $(responseText).find(".std-canvas table tr")
									.toArray()
									.map(row => {
										let comboValue = $(row).find("td select option:selected").text();
										if (!comboValue) return false;
										let answer = {
											question: $(row).find("td").text(),
											value: comboValue
										};
										if (["Rta Libre", "Libre"].indexOf(comboValue) !== -1) {
											answer.text = $(row).next().find("textarea").val();
										}
										return answer;
									})
									.filter(answer => !!answer);
								console.log(values);
								debugger;
							});
						});
				});
		}).catch(e => {
			trackError(e, "getSentSurveys");
			throw e;
		});
	};
	 */

	// Public
	return {
		getStartYear: getStartYear,
		getStudentId: getStudentId,
		getCourses: getCourses,
		getProfessorClassesFromSurveys: getProfessorClassesFromSurveys
	};
};
