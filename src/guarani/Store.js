const HASHED_STUDENT_ID_DATASTORE_KEY = "UtnBaHelper.HashedStudentId";

export class Store {
	readHashedStudentIdFromStore() {
		return chrome.storage.sync.get(HASHED_STUDENT_ID_DATASTORE_KEY).then(result => {
			return result[HASHED_STUDENT_ID_DATASTORE_KEY];
		});
	}

	saveHashedStudentIdToStore(hashedStudentId) {
		// Some old browsers return undefined instead of Promise... so we return an empty one if that happens.
		return chrome.storage.sync.set({[HASHED_STUDENT_ID_DATASTORE_KEY]: hashedStudentId}) || Promise.resolve();
	}
}
