let PagesDataParser = function (utils, apiConnector) {

	let trackError = function (error, methodName) {
		console.error("Error at " + methodName, error);
		return apiConnector.logError(methodName, typeof error === 'object' ? JSON.stringify(error) : error);
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

	/**
	 * Fetches the current classes that the student is having in order to know the schedules of them
	 * @return an array of objects for each class, that contains the schedule for it.
	 */
	let getClassSchedules = function () {
		let setFormCookies = (jsOnClick) => {
			// onclick string is something like this:
			// "if(fn_horarios_set(38736,'K3573','082032','Matemática Superior')){return jslib_submit(null,'/alu/asist.do',null,null,false );} else return false;"
			let match = /^if\(fn_horarios_set\((\d+),'(.*)','(.*)','(.*)'\)\){return jslib_submit/.exec(jsOnClick);
			if (!match || match.length !== 5) throw "jsOnClick couldn't be parsed: " + jsOnClick;
			let cookies = {
				ckidcu: parseInt(match[1]),
				ckcucodigo: match[2],
				ckmacodigo: match[3],
				ckmanombre: match[4],
			};
			Object.entries(cookies).forEach(entry => document.cookie = `${entry[0]}=${entry[1]};path=/`);
		};
		const FIRST_QUARTER_MONTHS = new Set([3, 4, 5, 6]);
		const SECOND_QUARTER_MONTHS = new Set([8, 9, 10, 11]);
		let calculateYearAndQuarterFromDays = () => {
			// Cookies should have been already set so we can get asist.do
			return getPageContents("/alu/asist.do").then(responseText => {
				let months = new Set();
				let years = new Set();
				$(responseText).find(".std-canvas table:first tr:not(:first)")
					.toArray()
					.filter(tr => $(tr).find("td").length === 5)
					.map(tr => $(tr).find("td:eq(3)").text())
					.forEach(date => {
						let splits = date.split("/");
						months.add(parseInt(splits[1]));
						years.add(parseInt(splits[2]));
					});
				if (years.size !== 1) throw "Couldn't parse years: " + Array.from(years);
				let year = Array.from(years)[0];

				let isInFirstQuarter = false;
				let isInSecondQuarter = false;
				for (let m of FIRST_QUARTER_MONTHS) if (months.has(m)) isInFirstQuarter = true;
				for (let m of SECOND_QUARTER_MONTHS) if (months.has(m)) isInSecondQuarter = true;
				let quarter;

				if (isInFirstQuarter && isInSecondQuarter) {
					quarter = "A";
				} else if (isInFirstQuarter) {
					quarter = "1C";
				} else if (isInSecondQuarter) {
					quarter = "2C";
				} else {
					throw "Couldn't parse months: " + Array.from(months);
				}
				return {
					year: year,
					quarter: quarter
				};
			});
		};

		return getPageContents("/alu/horarios.do").then(responseText => {
			return Promise.all($(responseText).find(".std-canvas table:first tr:not(:first)")
				.toArray()
				.filter(tr => $(tr).find("td").length >= 6)
				.map(tr => {
					let $tds = $(tr).find("td");
					let classCode = $tds.eq(0).text();
					let courseCode = $tds.eq(1).text();
					let branch = $tds.eq(3).text();
					let schedules = utils.getSchedulesFromString($tds.eq(5).text());

					// Calculate the year and quarter from the list of days:
					let jsOnClick = $(tr).next("tr").find("td span:first a").attr("onclick");
					setFormCookies(jsOnClick);

					return calculateYearAndQuarterFromDays().then(result => {
						return {
							year: result.year,
							quarter: result.quarter,
							classCode: classCode,
							courseCode: courseCode,
							branch: branch,
							schedules: schedules
						};
					});
				}));
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
			trackError(e, "parseMetadataFromSurveyRow");
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
						if (["Rta Libre", "Libre", "No opina"].indexOf(comboValue) !== -1) {
							answer.type = "TEXT";
							answer.value = $tr.next().find("textarea").val() || null;
						} else {
							answer.type = "PERCENTAGE";
							answer.value = parseInt(comboValue);
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
			trackError(e, "getSentSurveys");
			throw e;
		});
	};


	// Public
	return {
		getStartYear: getStartYear,
		getStudentId: getStudentId,

		getCourses: getCourses,

		getClassSchedules: getClassSchedules,
		getProfessorClassesFromSurveys: getProfessorClassesFromSurveys,

		getTakenSurveys: getTakenSurveys,
	};
};
