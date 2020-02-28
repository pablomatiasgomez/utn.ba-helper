let ApiConnector = function () {

	const CLIENT = "CHROME@" + chrome.runtime.getManifest().version;
	const BASE_API_URL = "http://www.pablomatiasgomez.com.ar/sigahelper/v1";

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

	let logMessage = function (method, isError, message) {
		return postData(BASE_API_URL + "/log", {
			method: method,
			error: isError,
			message: message
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
				schedules: classSchedule.schedules.map(mapScheduleToApi)
			};
		}));
	};

	let postProfessorClasses = function (professorClasses) {
		return postData(BASE_API_URL + "/professor-classes", professorClasses);
	};

	let postProfessorSurveys = function (surveys) {
		return postData(BASE_API_URL + "/professor-surveys", surveys);
	};

	let mapScheduleToApi = function (schedule) {
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

	let getProfessorSurveysAggregate = function (professorName) {
		return getData(BASE_API_URL + "/aggregated-professor-surveys?professorName=" + encodeURIComponent(professorName));
	};

	let getPreviousProfessors = function (previousProfessorsRequest) {
		Object.values(previousProfessorsRequest.futureClassSchedules).forEach(branchWithSchedule => {
			return branchWithSchedule.schedules = branchWithSchedule.schedules.map(mapScheduleToApi);
		});
		return postData(BASE_API_URL + "/previous-professors", previousProfessorsRequest);
	};

	let searchCourses = function (query) {
		return getData(BASE_API_URL + "/courses?q=" + encodeURIComponent(query));
	};

	let getClassesForCourse = function (courseCode, offset, limit) {
		let queryParams = buildQueryParams({
			courseCode: courseCode,
			offset: offset,
			limit: limit
		});
		return getData(BASE_API_URL + "/classes?" + queryParams).then(response => {
			response.forEach(classWithProfessor => {
				classWithProfessor.classSchedule.schedules = classWithProfessor.classSchedule.schedules.map(mapScheduleFromApi);
			});
			return response;
		});
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

	let mapScheduleFromApi = function (schedule) {
		return {
			day: Object.entries(DAYS_MAPPING).filter(entry => entry[1] === schedule.day)[0][0],
			shift: Object.entries(SHIFTS_MAPPING).filter(entry => entry[1] === schedule.shift)[0][0],
			firstHour: schedule.firstHour.toString(),
			lastHour: schedule.lastHour.toString()
		};
	};

	// ---

	let makeRequest = function (options) {
		return new Promise((resolve, reject) => {
			chrome.runtime.sendMessage(options, response => (response && response.error) ? reject(response.error) : resolve(response));
		}).catch(e => {
			console.error("Error while making request", e);
			throw e;
		});
	};

	let buildQueryParams = function (params) {
		return Object.entries(params)
			.map(entry => `${encodeURIComponent(entry[0])}=${encodeURIComponent(entry[1])}`)
			.join("&")
	};


	// Public
	return {
		// POSTs:
		logMessage: logMessage,
		logUserStat: logUserStat,
		postClassSchedules: postClassSchedules,
		postProfessorClasses: postProfessorClasses,
		postProfessorSurveys: postProfessorSurveys,

		// GETs:
		searchProfessors: searchProfessors,
		getProfessorSurveysAggregate: getProfessorSurveysAggregate,
		getPreviousProfessors: getPreviousProfessors,
		searchCourses: searchCourses,
		getClassesForCourse: getClassesForCourse,
	};
};
