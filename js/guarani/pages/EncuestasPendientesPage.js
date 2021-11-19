let EncuestasPendientesPage = function (dataCollector, store) {

	// Init
	return Promise.resolve().then(() => {
		return dataCollector.getHashedStudentId();
	}).then(hashedStudentId => {
		let iframeUrl = $("#encuesta iframe").get(0).src;
		return store.appendSurveyFormDataToStore(iframeUrl, {
			hashedStudentId: hashedStudentId,
		});
	});
};
