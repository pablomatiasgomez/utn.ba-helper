(function () {
	window.EmbraceWebSdk.sdk.initSDK({
		appID: '08sxm',
		appVersion: chrome.runtime.getManifest().version,
	});
	window.EmbraceWebSdk.session.addProperty("content-script", "main-kolla", {lifespan: "permanent"});

	let apiConnector = new UtnBaHelper.ApiConnector();
	let utils = new UtnBaHelper.Utils(apiConnector);
	return utils.runAsync("mainKolla", () => {
		let store = new UtnBaHelper.Store();
		let pagesDataParser = new UtnBaHelper.PagesDataParser(utils);

		// This main will only be executed on kolla pages.
		if (!window.location.pathname.startsWith("/siu/kolla")) return;

		$("#btn-terminar").on("mousedown", function () {
			return utils.runAsync("surveyFinished", () => {
				return store.readHashedStudentIdFromStore().then(hashedStudentId => {
					if (!hashedStudentId) throw new Error(`Couldn't find hashedStudentId within form url ${location.href}.`);

					let surveys = pagesDataParser.parseKollaSurveyForm($(document), $(document).find("html").html());
					if (surveys.length) {
						surveys.forEach(survey => survey.surveyTaker = hashedStudentId);
						return apiConnector.postProfessorSurveys(surveys);
					}
				});
			});
		});
	});
})();
