let ProfessorClassesCollector = function (pagesDataParser, apiConnector) {

	let SESSION_STORAGE_CHECKED_KEY = "SigaHelper.ProfessorClassesCollector";

	let collectIfNeeded = function () {
		// TODO this should be checked for each student id.
		// if (sessionStorage.getItem(SESSION_STORAGE_CHECKED_KEY)) return;

		return pagesDataParser.getProfessorClassesFromSurveys().then(professorClasses => {
			console.log(professorClasses);
			return apiConnector.postProfessorClasses(professorClasses);
		}).then(() => {
			sessionStorage.setItem(SESSION_STORAGE_CHECKED_KEY, JSON.stringify(true));
		});
	};

	// Public
	return {
		collectIfNeeded: collectIfNeeded
	};
};
