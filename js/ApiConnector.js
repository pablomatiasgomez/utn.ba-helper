let ApiConnector = function () {

	const CLIENT = "CHROME@" + chrome.runtime.getManifest().version;
	const BASE_API_URL = "http://localhost:8080/sigahelper/v1";
	//const BASE_API_URL = "http://www.pablomatiasgomez.com.ar/sigahelper/v1";

	let logError = function (methodName, error) {
		return postData(BASE_API_URL + "/errors", {
			method: methodName,
			error: error,
		});
	};

	let logUserStat = function (studentId, pesoAcademico, passingGradesAverage, allGradesAverage, passingGradesCount, failingGradesCount) {
		return postData(BASE_API_URL + "/user-stats", {
			studentId: studentId,
			pesoAcademico: pesoAcademico,
			passingGradesAverage: passingGradesAverage,
			allGradesAverage: allGradesAverage,
			passingGradesCount: passingGradesCount,
			failingGradesCount: failingGradesCount
		});
	};

	let postClassSchedules = function (classSchedules) {
		return postData(BASE_API_URL + "/class-schedules", classSchedules.map(classSchedule => {
			return {
				year: classSchedule.year,
				quarter: classSchedule.quarter,
				classCode: classSchedule.classCode,
				courseCode: classSchedule.courseCode,
				branch: classSchedule.branch,
				schedules: classSchedule.schedules.map(mapSchedule)
			};
		}));
	};

	let postProfessorClasses = function (professorClasses) {
		return postData(BASE_API_URL + "/professor-classes", professorClasses);
	};

	let postProfessorSurveys = function (surveys) {
		return postData(BASE_API_URL + "/professor-surveys", surveys);
	};

	const DAYS_MAPPING = {
		"Lu": "MONDAY",
		"Ma": "TUESDAY",
		"Mi": "WEDNESDAY",
		"Ju": "THURSDAY",
		"Vi": "FRIDAY",
		"Sa": "SATURDAY",
	};
	const SHIFTS_MAPPING = {
		"m": "MORNING",
		"t": "AFTERNOON",
		"n": "NIGHT",
	};
	let mapSchedule = function (schedule) {
		return {
			day: DAYS_MAPPING[schedule.day],
			shift: SHIFTS_MAPPING[schedule.shift],
			firstHour: parseInt(schedule.firstHour),
			lastHour: parseInt(schedule.lastHour),
		};
	};

	let postData = function (url, data) {
		return $.ajax({
			type: "POST",
			url: url,
			dataType: "json",
			contentType: "application/json; charset=utf-8",
			headers: {
				"X-Client": CLIENT,
			},
			data: JSON.stringify(data)
		});
	};

	// Public
	return {
		logUserStat: logUserStat,
		postClassSchedules: postClassSchedules,
		postProfessorClasses: postProfessorClasses,
		postProfessorSurveys: postProfessorSurveys,
		logError: logError,
	};
};
