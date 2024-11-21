if (!window.UtnBaHelper) window.UtnBaHelper = {};
UtnBaHelper.DataCollector = function (store, pagesDataParser, apiConnector) {

	const LOCAL_STORAGE_DATA_COLLECTOR_KEY = "UtnBaHelper.DataCollector";

	const ONE_DAY_MS = 24 * 60 * 60 * 1000;

	let hashedStudentId;
	let getHashedStudentId = function () {
		if (hashedStudentId) {
			return Promise.resolve(hashedStudentId);
		}
		return pagesDataParser.getStudentId().then(studentId => {
			hashedStudentId = hashCode(studentId);
			return hashedStudentId;
		});
	};

	/**
	 * Sends the user stat with the hashed student it to keep data anonymous.
	 */
	let logUserStat = function (pesoAcademico, passingGradesAverage, allGradesAverage, passingGradesCount, failingGradesCount) {
		return getHashedStudentId().then(hashedStudentId => {
			return apiConnector.logUserStat(hashedStudentId, pesoAcademico, passingGradesAverage, allGradesAverage, passingGradesCount, failingGradesCount);
		});
	};

	/**
	 * Collects, every one day or more, background data such as:
	 * - class schedules and professors
	 * @returns {Promise<void>}
	 */
	let collectBackgroundDataIfNeeded = function () {
		return getHashedStudentId().then(hashedStudentId => {
			// Save hashedStudentId to local storage, so that it can be used for surveys collection.
			return store.saveHashedStudentIdToStore(hashedStudentId).then(() => hashedStudentId);
		}).then(hashedStudentId => {
			let lastTimeCollected = getLastTimeCollectedForStudentId(hashedStudentId);

			let collectMethods = [
				{
					key: "schedules",
					minTime: ONE_DAY_MS,
					method: () => collectClassSchedulesWithProfessors(),
				},
				{
					key: "planCourses",
					minTime: ONE_DAY_MS * 90,
					method: () => collectStudentPlanCourses(),
				}
			];

			let shouldSaveLastTimeCollected = false;
			let promise = Promise.resolve();
			collectMethods.filter(collectMethod => {
				// Never collected or min time has passed.
				return !lastTimeCollected[collectMethod.key] || Date.now() - lastTimeCollected[collectMethod.key] > collectMethod.minTime;
			}).forEach(collectMethod => {
				promise = promise.then(() => {
					return collectMethod.method();
				}).then(() => {
					// If at least one collect method is executed, we need to save the last time collected info to local storage.
					shouldSaveLastTimeCollected = true;
					lastTimeCollected[collectMethod.key] = Date.now();
				});
			});

			return promise.then(() => {
				if (shouldSaveLastTimeCollected) {
					saveLastTimeCollected(hashedStudentId, lastTimeCollected);
				}
			});
		});
	};

	let collectClassSchedulesWithProfessors = function () {
		return Promise.all([
			pagesDataParser.getClassSchedules(),
			pagesDataParser.getProfessorClassesFromSurveys(),
		]).then(results => {
			let classSchedules = results[0].concat(results[1]);
			if (classSchedules.length) {
				return apiConnector.postClassSchedules(classSchedules);
			}
		});
	};

	let collectStudentPlanCourses = function () {
		return pagesDataParser.getStudentPlanCourses().then(planCourses => {
			return apiConnector.postCourses(planCourses);
		});
	};

	// -----

	let getLastTimeCollectedByHashedStudentId = function () {
		let lastTimeCollectedByHashedStudentId;
		try {
			// Don't know why, but some cases were failing with json parsing errors... We simply consider those as not present.
			lastTimeCollectedByHashedStudentId = JSON.parse(localStorage.getItem(LOCAL_STORAGE_DATA_COLLECTOR_KEY));
		} catch (e) {
			console.error(`Error parsing localStorage item...`, e);
		}
		if (!lastTimeCollectedByHashedStudentId) {
			lastTimeCollectedByHashedStudentId = {};
			localStorage.setItem(LOCAL_STORAGE_DATA_COLLECTOR_KEY, JSON.stringify(lastTimeCollectedByHashedStudentId));
		}
		return lastTimeCollectedByHashedStudentId;
	};

	let getLastTimeCollectedForStudentId = function (hashedStudentId) {
		return getLastTimeCollectedByHashedStudentId()[hashedStudentId] || {};
	};

	let saveLastTimeCollected = function (hashedStudentId, lastTimeCollected) {
		let lastTimeCollectedByHashedStudentId = getLastTimeCollectedByHashedStudentId();
		lastTimeCollectedByHashedStudentId[hashedStudentId] = lastTimeCollected;
		localStorage.setItem(LOCAL_STORAGE_DATA_COLLECTOR_KEY, JSON.stringify(lastTimeCollectedByHashedStudentId));
	};

	// Used to make the studentId anonymous.
	let hashCode = function (str) {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = ((hash << 5) - hash) + str.charCodeAt(i);
			hash = hash & hash; // Convert to 32bit integer
		}
		return hash;
	};

	// Public
	return {
		getHashedStudentId: getHashedStudentId,
		logUserStat: logUserStat,
		collectBackgroundDataIfNeeded: collectBackgroundDataIfNeeded,
	};
};
