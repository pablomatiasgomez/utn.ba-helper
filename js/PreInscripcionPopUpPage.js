var PreInscripcionPopUpPage = function(utils) {

	var getTimeInfoString = function(str) {
		var getStringForDay = function(dayStr) {
			var schedule = utils.parseScheduleString(dayStr);
			
			if (schedule) {
				return utils.days[schedule.day] + " (" + utils.turns[schedule.turn] + ") " + utils.hours[schedule.turn][schedule.firstHour].start + "hs a " + utils.hours[schedule.turn][schedule.lastHour].end + "hs";
			}
			return "";
		};

		var finalStr = "";
		$.each(str.split(" "), function() {
			finalStr += getStringForDay(this) + " y ";
		});
		return finalStr.substr(0, finalStr.length - 3);
	};

	var addTimeInfo = function($tr) {
		var $td = $tr.find("td:eq(2)");
		$td.html($td.text() + "<br /><b>" + getTimeInfoString($td.text()) + "</b>");
	};

	// Init
	(function() {
		$(".std-canvas table tbody tr").each(function(){
			addTimeInfo($(this));
		});
	})();


	// Public
	return {};
};