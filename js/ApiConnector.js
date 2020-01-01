let ApiConnector = function () {

	const CLIENT = "CHROME@" + chrome.runtime.getManifest().version;
	//const BASE_API_URL = "http://localhost:8080/sigahelper/v1";
	const BASE_API_URL = "http://www.pablomatiasgomez.com.ar/sigahelper/v1";

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

	let postProfessorClasses = function (professorClasses) {
		return postData(BASE_API_URL + "/professor-classes", professorClasses);
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
		postProfessorClasses: postProfessorClasses,
		logError: logError,
	};
};
