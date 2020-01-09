let DataCollector = function (pagesDataParser, apiConnector) {

	let LOCAL_STORAGE_DATA_COLLECTOR_KEY = "SigaHelper.DataCollector";

	// Used to make the studentId anonymous.
	let hashCode = function (str) {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			let char = str.charCodeAt(i);
			hash = ((hash << 5) - hash) + char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return hash;
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

	const ONE_DAY_MS = 24 * 60 * 60 * 1000;

	let collectIfNeeded = function () {
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

	// Public
	return {
		collectIfNeeded: collectIfNeeded
	};
};
