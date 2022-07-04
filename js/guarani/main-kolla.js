(function () {
	// This main will only be executed on kolla pages.
	if (!window.location.pathname.startsWith("/siu/kolla")) return;

	let apiConnector = new UtnBaHelper.ApiConnector();
	let utils = new UtnBaHelper.Utils(apiConnector);
	let store = new UtnBaHelper.Store();
	let pagesDataParser = new UtnBaHelper.PagesDataParser(utils);

	$("#btn-terminar").on("mousedown", function () {
		return utils.wrapEventFunction("surveyFinished", () => {
			return store.readSurveyFormsDataFromStore().then(surveyFormsData => {
				let data = surveyFormsData[location.href];
				if (!data) throw new Error(`Couldn't find survey form data for url ${location.href}. surveyFormsData: ${JSON.stringify(surveyFormsData)}`);
				let hashedStudentId = data.hashedStudentId;

				let surveys = pagesDataParser.parseKollaSurveyForm($(document));
				if (surveys.length) {
					surveys.forEach(survey => survey.surveyTaker = hashedStudentId);
					return apiConnector.postProfessorSurveys(surveys);
				}
			});
		});
	});

})();
