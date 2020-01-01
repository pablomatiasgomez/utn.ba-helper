let ProfessorClassesCollector = function (pagesDataParser, apiConnector) {

	let SESSION_STORAGE_CHECKED_KEY = "SigaHelper.ProfessorClassesCollector";

	let collectIfNeeded = function () {
		// TODO this should be checked for each student id.
		// if (sessionStorage.getItem(SESSION_STORAGE_CHECKED_KEY)) return;

		Promise.all([
			pagesDataParser.getProfessorClassesFromSurveys(),
			pagesDataParser.getClassSchedules()
		]).then(result => {
			let professorClasses = result[0];
			let classSchedules = result[1];
			return Promise.all([
				apiConnector.postProfessorClasses(professorClasses),
				apiConnector.postClassSchedules(classSchedules),
			]);
		}).then(() => {
			sessionStorage.setItem(SESSION_STORAGE_CHECKED_KEY, JSON.stringify(true));
		});
	};

	// Public
	return {
		collectIfNeeded: collectIfNeeded
	};
};
