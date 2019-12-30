let ApiConnector = function () {

	const CLIENT = "CHROME@" + chrome.runtime.getManifest().version;
	const BASE_API_URL = "http://localhost:8080/sigahelper/v1";
	//const BASE_API_URL = "http://www.pablomatiasgomez.com.ar/sigahelper/v1";
	const TRACKING_URL = "http://www.pablomatiasgomez.com.ar/sigahelper/track.php";

	let logError = function (methodName, error) {
		return postData(BASE_API_URL + "/errors", {
			method: methodName,
			error: error,
		});
	};

	let logUserStats = function (legajo, pesoAcademico, passingGradesAverage, allGradesAverage, passingGradesCount, failingGradesCount) {
		return postData(BASE_API_URL + "/user-stats", {
			id: legajo,
			pesoAcademico: pesoAcademico,
			passingGradesAverage: passingGradesAverage,
			allGradesAverage: allGradesAverage,
			passingGradesCount: passingGradesCount,
			failingGradesCount: failingGradesCount
		});
	};

	let trackTeachers = function (teachers) {
		// TODO better way!!! Just testing for now...
		$.ajax({
			type: 'POST',
			url: TRACKING_URL,
			headers: {
				'Accept': '*/*',
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			data: {
				from: BROWSER,
				version: VERSION,
				legajo: JSON.stringify(teachers),
				avgAp: 0,
				avgDesap: 0,
				pesoAcademico: 0,
			},
			jsonp: false,
			jsonpCallback: function () {
				return false;
			}
		});
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
		logUserStats: logUserStats,
		trackTeachers: trackTeachers,
		logError: logError,
	};
};
