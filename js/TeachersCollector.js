let TeachersCollector = function (pagesDataParser, apiConnector) {

	let SESSION_STORAGE_CHECKED_KEY = "SigaHelper.TeachersCollected";

	let collectIfNeeded = function () {
		// TODO this should be checked for each legajo.
		if (sessionStorage.getItem(SESSION_STORAGE_CHECKED_KEY)) return;

		return pagesDataParser.getTeachersFromPoll().then(teachers => {
			return apiConnector.postTeachers(teachers);
		}).then(() => {
			sessionStorage.setItem(SESSION_STORAGE_CHECKED_KEY, JSON.stringify(true));
		});
	};

	// Public
	return {
		collectIfNeeded: collectIfNeeded
	};
};
