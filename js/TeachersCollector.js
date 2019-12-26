var TeachersCollector = function(pagesDataParser, apiConnector) {

	let SESSION_STORAGE_CHECKED_KEY = "SigaHelper.TeachersCollected";

	var collectIfNeeded = function() {
		if (sessionStorage.getItem(SESSION_STORAGE_CHECKED_KEY)) return;

		return pagesDataParser.getTeachersFromPoll().then(teachers => {
			return apiConnector.trackTeachers(teachers);
		}).then(() => {
			sessionStorage.setItem(SESSION_STORAGE_CHECKED_KEY, true);
		});
	};

	// Public
	return {
		collectIfNeeded: collectIfNeeded
	};
};