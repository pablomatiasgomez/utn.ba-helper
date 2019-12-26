var ApiConnector = function() {

	const CLIENT = "CHROME@" + chrome.runtime.getManifest().version;
	const BASE_API_URL = "http://www.pablomatiasgomez.com.ar/sigahelper/v1";
	const TRACKING_URL = BASE_API_URL + "/userstats";

	var logUserStats = function(legajo, avgAprobados, avgDesaprobados, pesoAcademico) {
		postData(TRACKING_URL, {
			legajo: legajo,
			avgAp: avgAprobados,
			avgDesap: avgDesaprobados,
			pesoAcademico: pesoAcademico,
		});
	};

	var trackTeachers = function(teachers) {
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
			jsonpCallback: function() { return false; }
		});
	};

	var logError = function(occuredOn, error) {
		// TODO better way!!!
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
				legajo: occuredOn + "-" + error,
				avgAp: 0,
				avgDesap: 0,
				pesoAcademico: 0,
			},
			jsonp: false,
			jsonpCallback: function() { return false; }
		});
	};


	var postData = function(url, data) {
		$.ajax({
			type: "POST",
			url: url,
			dataType: "json",
			contentType: "application/json; charset=utf-8",
			headers: {
				"X-SigaHelper-Client": CLIENT,
			},
			data: data
		});
	}
	// Public
	return {
		logUserStats: logUserStats,
		trackTeachers:trackTeachers,
		logError: logError,
	};
};
