const CLIENT = `CHROME@${chrome.runtime.getManifest().version}`;
const BASE_API_URL = "https://www.pablomatiasgomez.com.ar/utnba-helper/v2";

export class ApiConnector {
	// POSTs:
	logMessage(method, isError, message) {
		return this.#postData(BASE_API_URL + "/log", {
			method: method,
			error: isError,
			message: message
		});
	}

	logUserStat(hashedStudentId, pesoAcademico, passingGradesAverage, allGradesAverage, passingGradesCount, failingGradesCount) {
		return this.#postData(BASE_API_URL + "/user-stats", {
			hashedStudentId: hashedStudentId,
			pesoAcademico: pesoAcademico,
			passingGradesAverage: passingGradesAverage,
			allGradesAverage: allGradesAverage,
			passingGradesCount: passingGradesCount,
			failingGradesCount: failingGradesCount
		});
	}

	postClassSchedules(classSchedules) {
		return this.#postData(BASE_API_URL + "/class-schedules", classSchedules);
	}

	postProfessorSurveys(surveys) {
		return this.#postData(BASE_API_URL + "/professor-surveys", surveys);
	}

	postCourses(courses) {
		return this.#postData(BASE_API_URL + "/courses", courses);
	}

	// GETs:
	getPreviousProfessors(previousProfessorsRequest) {
		return this.#postData(BASE_API_URL + "/previous-professors", previousProfessorsRequest);
	}

	searchProfessors(query) {
		return this.#getData(BASE_API_URL + "/professors?q=" + encodeURIComponent(query));
	}

	getProfessorSurveysAggregate(professorName) {
		return this.#getData(BASE_API_URL + "/aggregated-professor-surveys?professorName=" + encodeURIComponent(professorName));
	}

	getClassesForProfessor(professorName, offset, limit) {
		return this.#getClassesSchedules(null, professorName, offset, limit);
	}

	searchCourses(query) {
		return this.#getData(BASE_API_URL + "/courses?q=" + encodeURIComponent(query));
	}

	getPlanCourses(planCode) {
		return this.#getData(BASE_API_URL + "/courses?planCode=" + encodeURIComponent(planCode));
	}

	getClassesForCourse(courseCode, offset, limit) {
		return this.#getClassesSchedules(courseCode, null, offset, limit);
	}

	// Private:
	#getClassesSchedules(courseCode, professorName, offset, limit) {
		let params = {
			offset: offset,
			limit: limit
		};
		if (courseCode) params.courseCode = courseCode;
		if (professorName) params.professorName = professorName;
		return this.#getData(BASE_API_URL + "/class-schedules?" + this.#buildQueryParams(params));
	}

	#postData(url, data) {
		return this.#makeRequest({
			url: url,
			method: 'POST',
			headers: {
				"X-Client": CLIENT,
				"Content-type": "application/json; charset=utf-8"
			},
			body: JSON.stringify(data)
		});
	}

	#getData(url) {
		return this.#makeRequest({
			url: url,
			method: 'GET',
			headers: {
				"X-Client": CLIENT
			}
		});
	}

	async #makeRequest(options) {
		// TODO this is duplicated in Utils.backgroundFetch.
		let response = await chrome.runtime.sendMessage(options);
		if (response && response.errorStr) throw new Error(response.errorStr);
		return response;
	}

	#buildQueryParams(params) {
		return Object.entries(params)
			.map(entry => `${encodeURIComponent(entry[0])}=${encodeURIComponent(entry[1])}`)
			.join("&");
	}
}
