(function () {
	let apiConnector;
	let utils;
	try {
		apiConnector = new UtnBaHelper.ApiConnector();
		utils = new UtnBaHelper.Utils(apiConnector);
		let store = new UtnBaHelper.Store();
		let pagesDataParser = new UtnBaHelper.PagesDataParser(utils);

		// This main will only be executed on kolla pages.
		if (!window.location.pathname.startsWith("/siu/kolla")) return;

		$("#btn-terminar").on("mousedown", function () {
			return utils.runAsync("surveyFinished", () => {
				return store.readHashedStudentIdFromStore().then(hashedStudentId => {
					if (!hashedStudentId) throw new Error(`Couldn't find hashedStudentId within form url ${location.href}.`);

					let surveys = pagesDataParser.parseKollaSurveyForm($(document));
					if (surveys.length) {
						surveys.forEach(survey => survey.surveyTaker = hashedStudentId);
						return apiConnector.postProfessorSurveys(surveys);
					}
				});
			});
		});
	} catch (e) {
		return utils.logError("mainKolla", e);
	}
})();
