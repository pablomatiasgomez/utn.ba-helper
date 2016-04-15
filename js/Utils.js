var Utils = function() {
	var START_YEAR_DEFAULT = "2012";
	var STORAGE_START_YEAR_KEY = "startYear";
	var STORAGE_LEGAJO_KEY = "legajo";
	var BROWSER = "CHROME";
	var VERSION = chrome.runtime.getManifest().version;

	var hours = {
		m: {
			0: {
				start: "7:45",
				end: "8:30"
			},
			1: {
				start: "8:30",
				end: "9:15"
			},
			2: {
				start: "9:15",
				end: "10:00"
			},
			3: {
				start: "10:15",
				end: "11:00"
			},
			4: {
				start: "11:00",
				end: "11:45"
			},
			5: {
				start: "11:45",
				end: "12:30"
			},
			6: {
				start: "12:30",
				end: "13:15"
			}
		},
		t: {
			0: {
				start: "13:30",
				end: "14:15"
			},
			1: {
				start: "14:15",
				end: "15:00"
			},
			2: {
				start: "15:00",
				end: "15:45"
			},
			3: {
				start: "16:00",
				end: "16:45"
			},
			4: {
				start: "16:45",
				end: "17:30"
			},
			5: {
				start: "17:30",
				end: "18:15"
			},
			6: {
				start: "18:15",
				end: "19:00"
			},
		},
		n: {
			0: {
				start: "18:15",
				end: "19:00"
			},
			1: {
				start: "19:00",
				end: "19:45"
			},
			2: {
				start: "19:45",
				end: "20:30"
			},
			3: {
				start: "20:45",
				end: "21:30"
			},
			4: {
				start: "21:30",
				end: "22:15"
			},
			5: {
				start: "22:15",
				end: "23:00"
			},
			6: {
				start: "6", //Should never go through here.
				end: "6"
			}
		}
	};
	var days = {
		Lu: "Lunes",
		Ma: "Martes",
		Mi: "Miercoles",
		Ju: "Jueves",
		Vi: "Viernes",
		Sa: "Sabado"
	};
	var turns = {
		m: "Mañana",
		t: "Tarde",
		n: "Noche"
	};


	var getStartYear = function(callback) {
		if (localStorage.getItem(STORAGE_START_YEAR_KEY)) {
			callback(localStorage.getItem(STORAGE_START_YEAR_KEY));
		} else {
			$.ajax({
				url: "/alu/libreta.do", 
				complete: function(data) {
					if (data.status == 200) {
						var startDate = $(data.responseText).find(".std-canvas table:first tbody tr:last td:first").text();
						var startYear = startDate.split("/")[2];
						localStorage.setItem(STORAGE_START_YEAR_KEY, startYear);
						callback(startYear);
					} else {
						callback(START_YEAR_DEFAULT);
					}
				}
			});
		}
	};

	var setStartYear = function(startYear) {
		localStorage.setItem(STORAGE_START_YEAR_KEY, startYear);
	};

	var getNumeroLegajo = function(callback) {
		if (localStorage.getItem(STORAGE_LEGAJO_KEY)) {
			callback(localStorage.getItem(STORAGE_LEGAJO_KEY));
		} else {
			$.ajax({
				url: "/alu/inscurcomp.do", 
				complete: function(data) {
					if (data.status == 200) {
						var legajo = $(data.responseText).find("div.center p.mask1 span").text();
						localStorage.setItem(STORAGE_LEGAJO_KEY, legajo);
						callback(legajo);
					} else {
						callback(null);
					}
				}
			});
		}
	};

	var postData = function(avgAprobados, avgDesaprobados, pesoAcademico) {
		var getQueryStringKeyValue = function(key, value) {
			return key + "=" + encodeURIComponent(value) + "&";
		};

		getNumeroLegajo(function(legajo) {
			var data = "";
			data += getQueryStringKeyValue("from", BROWSER);
			data += getQueryStringKeyValue("version", VERSION);
			data += getQueryStringKeyValue("legajo", legajo);
			data += getQueryStringKeyValue("avgAp", avgAprobados);
			data += getQueryStringKeyValue("avgDesap", avgDesaprobados);
			data += getQueryStringKeyValue("pesoAcademico", pesoAcademico);

			$.ajax({
				type: 'POST',
				url: "http://siga.web44.net/add.php",
				headers: {
					'Accept': '*/*',
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				data: data,
				jsonp: false,
				jsonpCallback: function() { return false; }
			});
		});
	};


	var parseScheduleString = function(str) {
		if (str.indexOf("(") == -1 || str.indexOf(":") == -1) return;

		return {
			day: str.split("(")[0].replace("á", "a"),
			turn: str.match(/\(([^)]+)\)/)[1],
			firstHour: str.split(")")[1].split(":")[0],
			lastHour: str.split(")")[1].split(":")[1],
		};
	};

	var getTextNodes = function($item) {
		var arr = $item.contents().filter(function() {
			return this.nodeType !== 1;
		});
		var strArr = [];
		$(arr).each(function() {
			strArr.push($(this).text());
		});
		return strArr;
	};

	// Public
	return {
		hours: hours,
		days: days,
		turns: turns,

		getStartYear: getStartYear,
		setStartYear: setStartYear,
		parseScheduleString: parseScheduleString,

		getTextNodes: getTextNodes,

		postData: postData
	};
};