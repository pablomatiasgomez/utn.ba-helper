if (!window.UtnBaHelper) window.UtnBaHelper = {};
UtnBaHelper.Store = function () {

	const HASHED_STUDENT_ID_DATASTORE_KEY = "UtnBaHelper.HashedStudentId";

	let readHashedStudentIdFromStore = function () {
		return new Promise((resolve, reject) => {
			chrome.storage.sync.get(HASHED_STUDENT_ID_DATASTORE_KEY, function (result) {
				if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
				resolve(result[HASHED_STUDENT_ID_DATASTORE_KEY]);
			});
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
