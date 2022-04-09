if (!window.UtnBaHelper) window.UtnBaHelper = {};
UtnBaHelper.Store = function () {

	const SURVEY_FORMS_DATA_STORE_KEY = "UtnBaHelper.SurveyFormData";

	let readSurveyFormsDataFromStore = function () {
		return new Promise((resolve, reject) => {
			chrome.storage.sync.get(SURVEY_FORMS_DATA_STORE_KEY, function (result) {
				if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
				resolve(result[SURVEY_FORMS_DATA_STORE_KEY] || {});
			});
		});
	};

	let saveSurveyFormsDataToStore = function (surveyFormsData) {
		return chrome.storage.sync.set({[SURVEY_FORMS_DATA_STORE_KEY]: surveyFormsData});
	};

	// Public
	return {
		readSurveyFormsDataFromStore: readSurveyFormsDataFromStore,
		saveSurveyFormsDataToStore: saveSurveyFormsDataToStore,
	};
};
