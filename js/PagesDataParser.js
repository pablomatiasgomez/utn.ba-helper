var PagesDataParser = function(dataTracker) {

	var getPageContents = function(url) {
		return $.ajax(url);
	};

	var getStartYear = function() {
		return getPageContents("/alu/libreta.do").then(responseText => {
			var startDate = $(responseText).find(".std-canvas table:first tbody tr:last td:first").text();
			var startYear = startDate.split("/")[2];
			return startYear;
		}).catch(e => {
			trackError(e, "getStartYear");
			return null;
		});
	};

	var getNumeroLegajo = function() {
		return getPageContents("/alu/inscurcomp.do").then(responseText => {
			var legajo = $(responseText).find("div.center p.mask1 span").text();
			return legajo;
		}).catch(e => {
			trackError(e, "getNumeroLegajo");
			return null;
		});
	};

	var getSubjects = function() {
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

	var getTeachersFromPoll = function() {
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

	var trackError = function(error, methodName) {
		console.log(error);
		dataTracker.logError(methodName, error);
	};

	// Public
	return {
		getStartYear: getStartYear,
		getNumeroLegajo: getNumeroLegajo,
		getSubjects: getSubjects,
		getTeachersFromPoll: getTeachersFromPoll
	};
};