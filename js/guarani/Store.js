if (!window.UtnBaHelper) window.UtnBaHelper = {};
UtnBaHelper.Store = function () {

	const SURVEY_FORMS_DATA_STORE_KEY = "UtnBaHelper.SurveyFormData";
	const HASHED_STUDENT_ID_DATASTORE_KEY = "UtnBaHelper.HashedStudentId";

	let readHashedStudentIdFromStore = function () {
		return chrome.storage.sync.get(HASHED_STUDENT_ID_DATASTORE_KEY).then(result => {
			return result[HASHED_STUDENT_ID_DATASTORE_KEY];
		});
	};

	let saveHashedStudentIdToStore = function (hashedStudentId) {
		// TODO we could remove this in some days, this is to avoid uses that have the storage full (because of old urls..)
		return chrome.storage.sync.remove(SURVEY_FORMS_DATA_STORE_KEY).then(() => {
			return chrome.storage.sync.set({[HASHED_STUDENT_ID_DATASTORE_KEY]: hashedStudentId});
		});
	};

	// Public
	return {
		readHashedStudentIdFromStore: readHashedStudentIdFromStore,
		saveHashedStudentIdToStore: saveHashedStudentIdToStore,
	};
};
