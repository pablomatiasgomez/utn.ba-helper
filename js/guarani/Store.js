if (!window.UtnBaHelper) window.UtnBaHelper = {};
UtnBaHelper.Store = function () {

	const HASHED_STUDENT_ID_DATASTORE_KEY = "UtnBaHelper.HashedStudentId";

	// TODO we could remove this in some days, this is to avoid uses that have the storage full (because of old urls..)
	// noinspection JSIgnoredPromiseFromCall
	chrome.storage.sync.remove("UtnBaHelper.SurveyFormData")

	let readHashedStudentIdFromStore = function () {
		return chrome.storage.sync.get(HASHED_STUDENT_ID_DATASTORE_KEY).then(result => {
			return result[HASHED_STUDENT_ID_DATASTORE_KEY];
		});
	};

	let saveHashedStudentIdToStore = function (hashedStudentId) {
		return chrome.storage.sync.set({[HASHED_STUDENT_ID_DATASTORE_KEY]: hashedStudentId});
	};

	// Public
	return {
		readHashedStudentIdFromStore: readHashedStudentIdFromStore,
		saveHashedStudentIdToStore: saveHashedStudentIdToStore,
	};
};
