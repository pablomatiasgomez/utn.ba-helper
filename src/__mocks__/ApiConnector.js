export class ApiConnector {
	// POSTs:
	logMessage(method, isError, message) {
	}

	logUserStat(hashedStudentId, pesoAcademico, passingGradesAverage, allGradesAverage, passingGradesCount, failingGradesCount) {
	}

	postClassSchedules(classSchedules) {
	}

	postProfessorSurveys(surveys) {
	}

	postCourses(courses) {
	}

	// GETs:
	getPreviousProfessors(previousProfessorsRequest) {
		return Promise.resolve([]);
	}

	searchProfessors(query) {
		return Promise.resolve([]);
	}

	getProfessorSurveysAggregate(professorName) {
		return Promise.resolve([]);
	}

	getClassesForProfessor(professorName, offset, limit) {
		return Promise.resolve([]);
	}

	searchCourses(query) {
		return Promise.resolve([]);
	}

	getPlanCourses(planCode) {
		return Promise.resolve([]);
	}

	getClassesForCourse(courseCode, offset, limit) {
		return Promise.resolve([]);
	}
}
