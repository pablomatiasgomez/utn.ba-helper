(function () {
	// This main will only be executed on kolla pages.
	if (!window.location.pathname.startsWith("/siu/kolla")) return;

	let apiConnector = new ApiConnector("guarani");
	let utils = new Utils(apiConnector);
	let store = new Store();
	let pagesDataParser = new PagesDataParser(utils);

	let hashedStudentId;
	utils.wrapEventFunction("getHashedStundentId", () => {
		return store.readSurveyFormsDataFromStore().then(surveyFormsData => {
			let data = surveyFormsData[location.href];
			if (!data) throw new Error(`Couldn't find suvey form data for url ${location.href}`);
			hashedStudentId = data.hashedStudentId;
		});
	});

	$("#btn-terminar").on("mousedown", function () {
		return utils.wrapEventFunction("surveyFinished", () => {
			let surveys = pagesDataParser.parseKollaSurveyForm($(document));
			if (surveys.length) {
				surveys.forEach(survey => survey.surveyTaker = hashedStudentId);
				return apiConnector.postProfessorSurveys(surveys);
			}
		});
	});

})();
