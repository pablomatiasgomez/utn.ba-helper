let DataCollector = function (pagesDataParser, apiConnector) {

	const LOCAL_STORAGE_DATA_COLLECTOR_KEY = "SigaHelper.DataCollector";
	const ONE_DAY_MS = 24 * 60 * 60 * 1000;

	/**
	 * Sends the user stat with the hashed student it to keep data anonymous.
	 */
	let logUserStat = function (pesoAcademico, passingGradesAverage, allGradesAverage, passingGradesCount, failingGradesCount) {
		return pagesDataParser.getStudentId().then(studentId => {
			let hashedStudentId = hashCode(studentId);
			return apiConnector.logUserStat(hashedStudentId, pesoAcademico, passingGradesAverage, allGradesAverage, passingGradesCount, failingGradesCount);
		});
	};

	/**
	 * Collects, every one day or more, background data such as:
	 * - class schedules and professors
	 * - taken surveys
	 * @return {Promise<*>}
	 */
	let collectBackgroundDataIfNeeded = function () {
		return pagesDataParser.getStudentId().then(studentId => {
			let lastTimeCollected = getLastTimeCollectedForStudentId(studentId);
			if (lastTimeCollected && (Date.now() - lastTimeCollected < ONE_DAY_MS)) {
				return; // Not collecting yet.
			}

			return Promise.resolve().then(() => {
				return collectClassSchedulesWithProfessors();
			}).then(() => {
				return collectTakenSurveys(studentId);
			}).then(() => {
				saveLastTimeCollected(studentId);
			});
		});
	};

	let collectTakenSurveys = function (studentId) {
		let hashedStudentId = hashCode(studentId); // Keep surveys anonymous

		return Promise.resolve().then(() => {
			return pagesDataParser.getTakenSurveys();
		}).then(takenSurveys => {
			takenSurveys.forEach(survey => survey.surveyTaker = hashedStudentId);
			return apiConnector.postProfessorSurveys(takenSurveys);
		});
	};

	let collectClassSchedulesWithProfessors = function () {
		return Promise.resolve().then(() => {
			return pagesDataParser.getProfessorClassesFromSurveys();
		}).then(professorClasses => {
			return apiConnector.postProfessorClasses(professorClasses);
		}).then(() => {
			return pagesDataParser.getClassSchedules();
		}).then(classSchedules => {
			return apiConnector.postClassSchedules(classSchedules);
		});
	};

	let getLastTimeCollectedByStudentId = function () {
		let lastTimeCollectedByStudentId = JSON.parse(localStorage.getItem(LOCAL_STORAGE_DATA_COLLECTOR_KEY));
		if (!lastTimeCollectedByStudentId) {
			lastTimeCollectedByStudentId = {};
			localStorage.setItem(LOCAL_STORAGE_DATA_COLLECTOR_KEY, JSON.stringify(lastTimeCollectedByStudentId));
		}
		return lastTimeCollectedByStudentId;
	};

	let getLastTimeCollectedForStudentId = function (studentId) {
		return getLastTimeCollectedByStudentId()[studentId];
	};

	let saveLastTimeCollected = function (studentId) {
		let lastTimeCollectedByStudentId = getLastTimeCollectedByStudentId();
		lastTimeCollectedByStudentId[studentId] = Date.now();
		localStorage.setItem(LOCAL_STORAGE_DATA_COLLECTOR_KEY, JSON.stringify(lastTimeCollectedByStudentId));
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
		logUserStat: logUserStat,
		collectBackgroundDataIfNeeded: collectBackgroundDataIfNeeded
	};
};
