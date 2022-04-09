if (!window.UtnBaHelper) window.UtnBaHelper = {};
UtnBaHelper.EncuestasPendientesPage = function (pagesDataParser, dataCollector, store) {

	// Init
	return Promise.resolve().then(() => {
		return Promise.all([
			dataCollector.getHashedStudentId(),
			pagesDataParser.getPendingProfessorSurveys(),
		]);
	}).then(results => {
		let hashedStudentId = results[0];
		let surveyUrls = results[1];

		let data = {
			hashedStudentId: hashedStudentId,
		};
		return store.readSurveyFormsDataFromStore().then(surveyFormsData => {
			surveyUrls.forEach(surveyUrl => surveyFormsData[surveyUrl.kollaUrl] = data);
			return store.saveSurveyFormsDataToStore(surveyFormsData);
		});
	});
};
