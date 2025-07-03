if (!window.UtnBaHelper) window.UtnBaHelper = {};
UtnBaHelper.ApiConnector = function () {

	let logMessage = function (method, isError, message) {
	};

	let logUserStat = function (hashedStudentId, pesoAcademico, passingGradesAverage, allGradesAverage, passingGradesCount, failingGradesCount) {
	};

	let postClassSchedules = function (classSchedules) {
	};

	let postProfessorSurveys = function (surveys) {
	};

	let postCourses = function (courses) {
	}

	// ------

	let getPreviousProfessors = function (previousProfessorsRequest) {
		return Promise.resolve([]);
	};

	let searchProfessors = function (query) {
		return Promise.resolve([]);
	};

	let getProfessorSurveysAggregate = function (professorName) {
		return Promise.resolve([]);
	};

	let getClassesForProfessor = function (professorName, offset, limit) {
		return Promise.resolve([]);
	};

	let searchCourses = function (query) {
		return Promise.resolve([]);
	};

	let getPlanCourses = function (planCode) {
		return Promise.resolve([]);
	};

	let getClassesForCourse = function (courseCode, offset, limit) {
		return Promise.resolve([]);
	};

	let getClassesSchedules = function (courseCode, professorName, offset, limit) {
		return Promise.resolve([]);
	};

	// Public
	return {
		// POSTs:
		logMessage: logMessage,
		logUserStat: logUserStat,
		postClassSchedules: postClassSchedules,
		postProfessorSurveys: postProfessorSurveys,
		postCourses: postCourses,

		// GETs:
		getPreviousProfessors: getPreviousProfessors,
		searchProfessors: searchProfessors,
		getProfessorSurveysAggregate: getProfessorSurveysAggregate,
		getClassesForProfessor: getClassesForProfessor,
		searchCourses: searchCourses,
		getPlanCourses: getPlanCourses,
		getClassesForCourse: getClassesForCourse,
	};
};
