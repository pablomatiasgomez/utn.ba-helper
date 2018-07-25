var DataTracker = function() {

	var BROWSER = "CHROME";
	var VERSION = chrome.runtime.getManifest().version;
	var TRACKING_URL = "http://www.pablomatiasgomez.com.ar/sigahelper/track.php";

	var trackPesoAcademico = function(legajo, avgAprobados, avgDesaprobados, pesoAcademico) {
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
				legajo: legajo,
				avgAp: avgAprobados,
				avgDesap: avgDesaprobados,
				pesoAcademico: pesoAcademico,
			},
			jsonp: false,
			jsonpCallback: function() { return false; }
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

	// Public
	return {
		trackPesoAcademico: trackPesoAcademico,
		trackTeachers:trackTeachers,
		logError: logError,
	};
};
