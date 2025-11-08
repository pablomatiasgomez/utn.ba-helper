if (!window.UtnBaHelper) window.UtnBaHelper = {};
UtnBaHelper.Store = function () {

	const HASHED_STUDENT_ID_DATASTORE_KEY = "UtnBaHelper.HashedStudentId";

	let readHashedStudentIdFromStore = function () {
		return chrome.storage.sync.get(HASHED_STUDENT_ID_DATASTORE_KEY).then(result => {
			return result[HASHED_STUDENT_ID_DATASTORE_KEY];
		});
	};

	let saveHashedStudentIdToStore = function (hashedStudentId) {
		// Some old browsers return undefined instead of Promise... so we return an empty one if that happens.
		return chrome.storage.sync.set({[HASHED_STUDENT_ID_DATASTORE_KEY]: hashedStudentId}) || Promise.resolve();
	};

	// Public
	return {
		readHashedStudentIdFromStore: readHashedStudentIdFromStore,
		saveHashedStudentIdToStore: saveHashedStudentIdToStore,
	};
};
