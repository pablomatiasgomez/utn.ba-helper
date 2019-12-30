let PagesDataParser = function (apiConnector) {

	let trackError = function (error, methodName) {
		console.log(error);
		apiConnector.logError(methodName, error);
	};

	let getPageContents = function (url) {
		return $.ajax(url);
	};

	let getStartYear = function () {
		return getPageContents("/alu/libreta.do").then(responseText => {
			let startDate = $(responseText).find(".std-canvas table:first tbody tr:last td:first").text();
			let startYear = startDate.split("/")[2];
			return startYear;
		}).catch(e => {
			trackError(e, "getStartYear");
			return null;
		});
	};

	let getLegajo = function () {
		return getPageContents("/alu/inscurcomp.do").then(responseText => {
			return $(responseText).find("div.center p.mask1 span").text();
		}).catch(e => {
			trackError(e, "getNumeroLegajo");
			return null;
		});
	};

	let getSubjects = function () {
		let getSubjectsFromPage = page => {
			return getPageContents(page).then(responseText => {
				return $(responseText).find(".std-canvas table:first tbody tr:not(:first)")
					.map((i, elem) => $(elem).find("td:eq(1)").text())
					.toArray();
			});
		};

		return Promise.all([
			getSubjectsFromPage("/alu/acfin.do"),
			getSubjectsFromPage("/alu/actp.do")
		]).then(results => {
			let approvedSubjects = results[0];
			let signedSubjects = results[1];

			signedSubjects.removeIf(subject => approvedSubjects.indexOf(subject) !== -1);
			return {
				approved: approvedSubjects,
				signed: signedSubjects
			};
		}).catch(e => {
			trackError(e, "getSubjects");
			throw e;
		});
	};

	let getTeachersFromPoll = function () {
		return getPageContents("/alu/encdoc.do").then(responseText => {
			return $(responseText).find(".std-canvas .tab")
				.toArray()
				.flatMap(elem => {
					let course = $(elem).find("p").text().split(" ");
					let time = $(elem).prevAll("p").first().text().replace("_Encuesta", "").trim();
					let courseCode = course[0];
					let subjectCode = course[1];
					return $(elem).find("table tr")
						.toArray()
						// For each teacher we return an object with the same subject & course
						.map(elem => {
							let teacherName = $(elem).find("td:first").text();
							let teacherPosition = $(elem).find("td:eq(1)").text();
							return {
								time: time,
								courseCode: courseCode,
								subjectCode: subjectCode,
								teacherName: teacherName,
								teacherPosition: teacherPosition
							};
						});
				});
		}).catch(e => {
			trackError(e, "getTeachersFromPoll");
			throw e;
		});
	};

	var getSentSurveys = function () {
		return getPageContents("/alu/encdoc.do").then(responseText => {
			return $(responseText).find(".std-canvas .tab")
				.toArray()
				.flatMap(elem => {
					let course = $(elem).find("p").text().split(" ");
					let time = $(elem).prevAll("p").first().text().replace("_Encuesta", "").trim();
					let courseCode = course[0];
					let subjectCode = course[1];
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
										}
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

	// Public
	return {
		getStartYear: getStartYear,
		getLegajo: getLegajo,
		getSubjects: getSubjects,
		getTeachersFromPoll: getTeachersFromPoll
	};
};
