import {trace} from "@embrace-io/web-sdk";

const LOCAL_STORAGE_DATA_COLLECTOR_KEY = "UtnBaHelper.DataCollector";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export class DataCollector {
	#store;
	#pagesDataParser;
	#apiConnector;
	#hashedStudentId;

	constructor(store, pagesDataParser, apiConnector) {
		this.#store = store;
		this.#pagesDataParser = pagesDataParser;
		this.#apiConnector = apiConnector;
	}

	#getHashedStudentId() {
		if (this.#hashedStudentId) return this.#hashedStudentId;

		let studentId = this.#pagesDataParser.getStudentId();
		this.#hashedStudentId = this.#hashCode(studentId);
		return this.#hashedStudentId;
	}

	/**
	 * Sends the user stat with the hashed student it to keep data anonymous.
	 */
	#logUserStat(pesoAcademico, passingGradesAverage, allGradesAverage, passingGradesCount, failingGradesCount) {
		return this.#apiConnector.logUserStat(this.#getHashedStudentId(), pesoAcademico, passingGradesAverage, allGradesAverage, passingGradesCount, failingGradesCount);
	}

	/**
	 * Collects, every one day or more, background data such as:
	 * - class schedules and professors
	 * @returns {Promise<void>}
	 */
	#collectBackgroundDataIfNeeded() {
		let hashedStudentId = this.#getHashedStudentId();
		// Save hashedStudentId to local storage, so that it can be used for surveys collection.
		return this.#store.saveHashedStudentIdToStore(hashedStudentId).then(() => {
			let lastTimeCollected = this.#getLastTimeCollectedForStudentId(hashedStudentId);

			let collectMethods = [
				{
					key: "schedules",
					minTime: ONE_DAY_MS,
					method: () => this.#collectClassSchedulesWithProfessors(),
				},
				{
					key: "planCourses",
					minTime: ONE_DAY_MS * 180,
					method: () => this.#collectStudentPlanCourses(),
				}
			];

			let shouldSaveLastTimeCollected = false;
			let promise = Promise.resolve();
			collectMethods.filter(collectMethod => {
				// Never collected or min time has passed.
				return !lastTimeCollected[collectMethod.key] || Date.now() - lastTimeCollected[collectMethod.key] > collectMethod.minTime;
			}).forEach(collectMethod => {
				promise = promise.then(() => {
					const span = trace.startSpan("Collect-" + collectMethod.key);
					return collectMethod.method()
						.then(() => span.end())
						.catch((e) => {
							span.fail();
							throw e;
						});
				}).then(() => {
					// If at least one collect method is executed, we need to save the last time collected info to local storage.
					shouldSaveLastTimeCollected = true;
					lastTimeCollected[collectMethod.key] = Date.now();
				});
			});

			return promise.then(() => {
				if (shouldSaveLastTimeCollected) {
					this.#saveLastTimeCollected(hashedStudentId, lastTimeCollected);
				}
			});
		});
	}

	#collectClassSchedulesWithProfessors() {
		return Promise.all([
			this.#pagesDataParser.getClassSchedules(),
			this.#pagesDataParser.getProfessorClassesFromSurveys(),
		]).then(results => {
			let classSchedules = results[0].concat(results[1]);
			if (classSchedules.length) {
				return this.#apiConnector.postClassSchedules(classSchedules);
			}
		});
	}

	#collectStudentPlanCourses() {
		return this.#pagesDataParser.getStudentPlanCourses().then(planCourses => {
			return this.#apiConnector.postCourses(planCourses);
		});
	}

	// -----

	#getLastTimeCollectedByHashedStudentId() {
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
	}

	#getLastTimeCollectedForStudentId(hashedStudentId) {
		return this.#getLastTimeCollectedByHashedStudentId()[hashedStudentId] || {};
	}

	#saveLastTimeCollected(hashedStudentId, lastTimeCollected) {
		let lastTimeCollectedByHashedStudentId = this.#getLastTimeCollectedByHashedStudentId();
		lastTimeCollectedByHashedStudentId[hashedStudentId] = lastTimeCollected;
		localStorage.setItem(LOCAL_STORAGE_DATA_COLLECTOR_KEY, JSON.stringify(lastTimeCollectedByHashedStudentId));
	}

	// Used to make the studentId anonymous.
	#hashCode(str) {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = ((hash << 5) - hash) + str.charCodeAt(i);
			hash = hash & hash; // Convert to 32bit integer
		}
		return hash;
	}

	// Public methods
	logUserStat(pesoAcademico, passingGradesAverage, allGradesAverage, passingGradesCount, failingGradesCount) {
		return this.#logUserStat(pesoAcademico, passingGradesAverage, allGradesAverage, passingGradesCount, failingGradesCount);
	}

	collectBackgroundDataIfNeeded() {
		return this.#collectBackgroundDataIfNeeded();
	}
}
