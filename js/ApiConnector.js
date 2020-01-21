let ApiConnector = function () {

	const CLIENT = "CHROME@" + chrome.runtime.getManifest().version;
	const BASE_API_URL = "http://www.pablomatiasgomez.com.ar/sigahelper/v1";

	let logError = function (methodName, error) {
		return postData(BASE_API_URL + "/errors", {
			method: methodName,
			error: error,
		});
	};

	let logUserStat = function (hashedStudentId, pesoAcademico, passingGradesAverage, allGradesAverage, passingGradesCount, failingGradesCount) {
		return postData(BASE_API_URL + "/user-stats", {
			hashedStudentId: hashedStudentId,
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
		return makeRequest({
			url: url,
			method: 'POST',
			headers: {
				"X-Client": CLIENT,
				"Content-type": "application/json; charset=utf-8"
			},
			body: JSON.stringify(data)
		});
	};


	// ------

	let searchProfessors = function (query) {
		return getData(BASE_API_URL + "/professors?q=" + encodeURIComponent(query));
	};

	let getData = function (url) {
		return makeRequest({
			url: url,
			method: 'GET',
			headers: {
				"X-Client": CLIENT
			}
		});
	};

	let makeRequest = function (options) {
		return new Promise((resolve, reject) => {
			chrome.runtime.sendMessage(options, response => (response && response.error) ? reject(response.error) : resolve(response));
		}).catch(e => {
			console.error("Error while making request", e);
			throw e;
		});
	};

	// Public
	return {
		// POSTs:
		logError: logError,
		logUserStat: logUserStat,
		postClassSchedules: postClassSchedules,
		postProfessorClasses: postProfessorClasses,
		postProfessorSurveys: postProfessorSurveys,

		// GETs:
		searchProfessors: searchProfessors,
	};
};
