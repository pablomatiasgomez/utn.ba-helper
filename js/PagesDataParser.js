let PagesDataParser = function (utils, apiConnector) {

	let stringifyError = function (error) {
		if (error instanceof Error) return error.toString();
		if (typeof error === 'object') return JSON.stringify(error);
		return error;
	};

	let trackError = function (error, methodName) {
		console.error("Error at " + methodName, error);
		return apiConnector.logMessage(methodName, true, stringifyError(error));
	};

	let logInfo = function (message, methodName) {
		return apiConnector.logMessage(methodName, false, message);
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
			if (!studentId) {
				// Check if the user has been logged out..
				if ($(responseText).find("div.std-canvas div").text().trim() === "La sesión ha expirado") {
					throw "Couldn't get studentId because the user has been logged out.";
				}
				throw "Couldn't get studentId from responseText: " + responseText;
			}
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
	let getPassedCourses = function () {
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
			trackError(e, "getPassedCourses");
			throw e;
		});
	};

	/**
	 * Fetches the current classes that the student is having in order to know the schedules of them
	 * @return an array of objects for each class, that contains the schedule for it.
	 */
	let getClassSchedules = function () {
		return getPageContents("/alu/inscurcomp.do").then(responseText => {
			return $(responseText).find(".std-canvas table:eq(1) tr:not(:first)")
				.toArray()
				.map(tr => {
					let $tds = $(tr).find("td");

					// Possible values for time could be:
					// - "2019 Cuat 2/2"
					// - "2019 Anual"
					// - "2019      1/1"
					// - "Opcional"  (not mapping this one because it's useless..)
					let time = $tds.eq(1).find("span").text().replace("(", "").replace(")", "").trim();
					if (time === "Opcional") return null;
					let groups = /^(\d{4}) (Cuat (1|2)\/2|Anual|     1\/1)$/.exec(time);
					if (!groups) throw "Class time couldn't be parsed: " + time;

					let year = parseInt(groups[1]); // 2018, 2019, ...
					let quarter = (groups[2] === "Anual" || groups[2] === "     1/1") ? "A" : (groups[3] + "C"); // A, 1C, 2C
					let classCode = $tds.eq(2).text().trim();
					let courseCode = $tds.eq(0).text().trim();
					let branch = $tds.eq(3).text().trim().toUpperCase().replace(" ", "_"); // CAMPUS, MEDRANO, AULA_VIRTUAL
					let schedules = utils.getSchedulesFromString($tds.eq(5).text());

					return {
						year: year,
						quarter: quarter,
						classCode: classCode,
						courseCode: courseCode,
						branch: branch,
						schedules: schedules
					};
				})
				.filter(obj => !!obj);
		}).catch(e => {
			trackError(e, "getClassSchedules");
			throw e;
		});
	};

	/**
	 * Fetches the current surveys that the user has to take o has taken.
	 * For each of them resolves the current professor name, class, course, quarter, etc.
	 * @param onlyCompleted whether to include all surveys or only the completed ones.
	 * @return {Promise<Array<{ }>>} an array of objects for each combination of professor and class
	 */
	let parseMetadataFromSurveyRows = function (onlyCompleted = false) {
		return getPageContents("/alu/encdoc.do").then(responseText => {
			return $(responseText).find(".std-canvas .tab")
				.toArray()
				.flatMap(elem => {
					let typeStr = $(elem).prevAll("p").first().text().toLowerCase().replace("encuesta", "").replace("_", " ").trim();
					let groups = /^(docente|auxiliares) (\d{4}) (a|1|2)(nual|er c|do c)$/g.exec(typeStr);
					if (!groups || groups.length !== 5) throw "Type couldn't be parsed: " + typeStr;

					let surveyKind = groups[1].toUpperCase(); // DOCENTE, AUXILIARES
					let year = parseInt(groups[2]); // 2018, 2019, ...
					let quarter = groups[3] === "a" ? "A" : (groups[3] + "C"); // A, 1C, 2C

					let classTaken = $(elem).find("p").text().split(" ");
					let classCode = classTaken[0];
					let courseCode = classTaken[1];
					return $(elem).find("table tr")
						.toArray()
						.filter(tr => {
							let isCompleted = $(tr).find("td:eq(4) img").length > 0;
							return !onlyCompleted || isCompleted;
						})
						.map(tr => {
							let $tr = $(tr);
							// For each professor we return an object with the same class & course
							let professorName = $tr.find("td:first").text();
							let professorRole = $tr.find("td:eq(1)").text();
							return {
								$tr: $tr, // This is only used in the case of fetching the survey values...

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
			trackError(e, "parseMetadataFromSurveyRows");
			throw e;
		});
	};

	/**
	 * Fetches all the current surveys that the user has to take o has taken.
	 * For each of them resolves the current professor name, class, course, quarter, etc.
	 * @return an array of objects for each combination of professor and class
	 */
	let getProfessorClassesFromSurveys = function () {
		return parseMetadataFromSurveyRows(false).then(professorClasses => {
			// For professor classes we don't want to grab any other information so we just remove the $tr
			professorClasses.forEach(professorClass => delete professorClass["$tr"]);
			return professorClasses;
		});
	};

	let getTakenSurveys = function () {
		let getAnswersFromSurvey = (jsOnClick) => {
			// onclick string is something like this:
			// "if(fn_encuesta(51,36218,52143,'Z3574 [950309] Economía','[JEFE DE TP] GALLONI GUILLEN, ROLANDO')){return jslib_submit(null,'/alu/encdocpop.do','popup',null,false );} else return false;";
			let match = /^if\(fn_encuesta\((\d+),(\d+),(\d+),'(.*)','(.*)'\)\){return jslib_submit/.exec(jsOnClick);
			let form_iden = parseInt(match[1]);
			let form_idcu = parseInt(match[2]);
			let form_iddo = parseInt(match[3]);
			let form_curnom = match[4];
			let form_docnom = match[5];

			return $.ajax({
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
				return $(responseText).find(".std-canvas table tr")
					.toArray()
					.map(tr => {
						let $tr = $(tr);
						let question = $tr.find("td:eq(0)").text().trim();
						let comboValue = $tr.find("td:eq(1) select option:selected").text().trim();
						if (!comboValue) return false;

						let answer = {
							question: question,
						};

						// The way to know if the field is TEXT or PERCENTAGE is analyzing the second option of the select...
						let secondOption = $tr.find("td:eq(1) select option[value='2']").text().toLowerCase().trim();
						if (secondOption === "no opina") {
							answer.type = "TEXT";
							answer.value = $tr.next().find("textarea").val() || null;
						} else if (secondOption.endsWith("%")) {
							comboValue = parseInt(comboValue);
							answer.type = "PERCENTAGE";
							answer.value = isNaN(comboValue) ? null : comboValue;
						} else {
							throw "Couldn't parse second option: " + secondOption;
						}
						return answer;
					})
					.filter(answer => !!answer);
			});
		};

		return parseMetadataFromSurveyRows(true).then(surveysMetadata => {
			return Promise.all(surveysMetadata.map(surveyMetadata => {
				let jsOnClick = surveyMetadata.$tr.find("td:eq(3) a").attr("onclick");
				return getAnswersFromSurvey(jsOnClick).then(answers => {
					return {
						surveyKind: surveyMetadata.surveyKind,
						year: surveyMetadata.year,
						quarter: surveyMetadata.quarter,
						classCode: surveyMetadata.classCode,
						courseCode: surveyMetadata.courseCode,
						professorName: surveyMetadata.professorName,
						professorRole: surveyMetadata.professorRole,

						surveyFields: answers
					};
				});
			}));
		}).catch(e => {
			trackError(e, "getTakenSurveys");
			throw e;
		});
	};

	let logPlanIds = function () {
		return getPageContents("/alu/mat.do").then(responseText => {
			let plans = $(responseText).find(".std-canvas > div select option").toArray()
				.map(option => {
					let $option = $(option);
					let planId = $option.attr("value").trim();
					let planCode = $option.text().trim();
					if (!planId || planCode === "-nada-") return;
					return {
						planId: planId,
						planCode: planCode
					}
				})
				.filter(plan => !!plan);

			return logInfo(JSON.stringify(plans), "PlanIds");
		});
	};

	// Public
	return {
		getStartYear: getStartYear,
		getStudentId: getStudentId,

		getPassedCourses: getPassedCourses,

		getClassSchedules: getClassSchedules,
		getProfessorClassesFromSurveys: getProfessorClassesFromSurveys,

		getTakenSurveys: getTakenSurveys,

		logPlanIds: logPlanIds, // TODO delete once we know all the ids.
	};
};
