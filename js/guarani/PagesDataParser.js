let PagesDataParser = function (utils, apiConnector) {

	let trackError = function (error, methodName) {
		console.error("Error at " + methodName, error);
		return apiConnector.logMessage(methodName, true, utils.stringifyError(error));
	};

	// We want to fetch only once each page.
	let CACHED_PAGE_CONTENTS = {};
	let fetchPageContents = function (url) {
		if (CACHED_PAGE_CONTENTS[url]) {
			return Promise.resolve(CACHED_PAGE_CONTENTS[url]);
		}
		return $.ajax(url).then(responseText => {
			CACHED_PAGE_CONTENTS[url] = responseText;
			return responseText;
		});
	};

	/**
	 * Fetches and parses the way guarani's page ajax contents are loaded.
	 * Returned contexts are different script tags that contain the html so they need to be parsed.
	 */
	let fetchAjaxPageContents = function (url, infoId) {
		return fetchPageContents(url).then(responseText => {
			let response = JSON.parse(responseText);
			if (response.cod !== "1") throw `Invalid ajax contents ${responseText}`;
			let contents = $(response.cont).filter("script").toArray()
				.map(script => $(script).html())
				.filter(script => script.startsWith("kernel.renderer.on_arrival"))
				.map(script => JSON.parse(script.replace("kernel.renderer.on_arrival(", "").replace(");", "")))
				.filter(data => data.info.id === infoId)
				.map(data => data.content);
			if (contents.length !== 1) throw `Found unexpected number of page contents: ${contents.length}. responseText: ${responseText}`;
			return contents[0];
		});
	};

	/**
	 * Fetches a url that returns a pdf and parses the content into an array of strings.
	 * @param url url that returns a pdf.
	 * @returns {Promise<String[]>}
	 */
	let fetchPdfContents = function (url) {
		if (CACHED_PAGE_CONTENTS[url]) {
			return Promise.resolve(CACHED_PAGE_CONTENTS[url]);
		}
		return pdfjsLib.getDocument(url).promise.then(pdf => {
			let promises = Array.from(Array(pdf.numPages).keys())
				.map(i => pdf.getPage(i + 1)
					.then(page => page.getTextContent())
					.then(text => text.items.map(s => s.str)));
			return Promise.all(promises)
				.then(contents => contents.flat());
		}).then(contents => {
			CACHED_PAGE_CONTENTS[url] = contents;
			return contents;
		});
	};

	/**
	 * Fetches, from the register pdf, the current classes that the student is having, along with the studentId.
	 * Used for different puprposes:
	 * - Know the studentId
	 * - Collect classSchedules
	 * - Complete the grid when registering to new classes
	 * @return {Promise<{studentId: String, classSchedules: Array<{}>}>}
	 */
	let parseCurrentClassSchedules = function () {
		return fetchPdfContents("/autogestion/grado/calendario/descargar_comprobante").then(contents => {
			// We will iterate pdf contents one by one, validating the structure.
			let i = 0;
			let validateExpectedContents = expectedContents => expectedContents.forEach(expectedContent => {
				if (contents[i++] !== expectedContent) throw `Invalid pdf contents (${i - 1}): ${JSON.stringify(contents)}`;
			});

			validateExpectedContents(["", "COMPROBANTE DE INSCRIPCIÓN A CURSADA"]);

			let studentIdAndName = contents[i++];
			let groups = /^(\d{3}\.\d{3}-\d) (.*)$/.exec(studentIdAndName);
			if (!groups) throw `Couldn't parse studentIdAndName: ${studentIdAndName}`;
			let studentId = groups[1];

			validateExpectedContents(["Código", "Actividad", "Período", "Comisión", "Ubicación", "Aula", "Horario"]);

			let classSchedules = [];
			const yearAndQuarterRegex = /^((1|2)(?:er|do) Cuat|Anual) (\d{4})$/;
			// After all the class schedules rows, this is the following text so we know where to stop..
			while (contents[i] !== "Firma y Sello Departamento") {
				let courseCode = contents[i++];	// e.g.: 950701
				let courseName = contents[i++]; // e.g.: Fisica I

				let yearAndQuarter = contents[i++]; // e.g.: 1er Cuat 2021
				groups = yearAndQuarterRegex.exec(yearAndQuarter);
				if (!groups) {
					// Sometimes it can happen that the courseName was long enough that was split into two rows..
					courseName = `${courseName} ${yearAndQuarter}`;
					yearAndQuarter = contents[i++];
					groups = yearAndQuarterRegex.exec(yearAndQuarter);
				}
				if (!groups) throw `Class time couldn't be parsed: ${yearAndQuarter}. PdfContents: ${JSON.stringify(contents)}`;
				let quarter = (groups[1] === "Anual") ? "A" : (groups[2] + "C"); // A, 1C, 2C
				let year = parseInt(groups[3]);

				let classCode = contents[i++].toUpperCase(); // e.g.: Z1154

				let branch = contents[i++].toUpperCase()
					.replace(" ", "_")
					.replace("CAMPUS_VIRTUAL", "AULA_VIRTUAL"); // e.g.: CAMPUS, MEDRANO, AULA_VIRTUAL
				if (branch === "SIN_DESIGNAR") branch = null;

				i++; // (ClassRoomnumber) e.g.: "Sin definir", "2"

				let schedulesStr = contents[i++]; // e.g.: Lu(n)1:5 Mi(n)0:2
				// Sundays is not a valid day, not sure why this is happening, but ignoring..
				let schedules = ["Do(m)0:0", "Do(t)0:0", "Do(n)0:0"].includes(schedulesStr) ? null : utils.getSchedulesFromString(schedulesStr);

				classSchedules.push({
					year: year,
					quarter: quarter,
					courseName: courseName,
					classCode: classCode,
					courseCode: courseCode,
					branch: branch,
					schedules: schedules,
				});
			}

			return {
				studentId: studentId,
				classSchedules: classSchedules,
			};
		}).catch(e => {
			trackError(e, "parseCurrentClassSchedules");
			throw e;
		});
	};

	/**
	 * Tries to resolve and return the student id for the current logged in user.
	 * @returns {Promise<String>}
	 */
	let getStudentId = function () {
		return parseCurrentClassSchedules().then(response => response.studentId);
	};

	/**
	 * Fetches the current classes that the student is having in order to know the schedules of them.
	 * Also used to complete the grid when registering to new classes
	 * @returns {Promise<Array<{}>>} array of objects for each class, that contains the schedule for it.
	 */
	let getClassSchedules = function () {
		return parseCurrentClassSchedules().then(response => response.classSchedules);
	};

	/**
	 * The student's current plan code as shown in the /autogestion/grado/plan_estudio page.
	 * @returns {Promise<string>}
	 */
	let getStudentPlanCode = function () {
		return fetchAjaxPageContents("/autogestion/grado/plan_estudio", "info_plan").then(responseText => {
			let planText = $(responseText).filter(".encabezado").find("td:eq(1)").text();
			let groups = /^Plan: \((\w+)\)/.exec(planText);
			if (!groups) throw "planText couldn't be parsed: " + planText;
			return groups[1];
		}).catch(e => {
			trackError(e, "getStudentPlanCode");
			throw e;
		});
	};

	/**
	 * Parses all the student's academic history. Only includes approved courses, either signed or passed.
	 * @returns {Promise<{courseCode: String, type: String, date: Date }[]>}
	 */
	let parseAcademicHistory = function () {
		const typesMap = {
			"En curso": null,
			"Regularidad": "SIGNED",
			"Promoción": "PASSED",
			"Examen": "PASSED",
			"Equivalencia Parcial": "SIGNED",
			"Equivalencia Total": "PASSED",
		};
		const gradesRegex = [
			/Inicio de dictado/,
			/\d{1,2} \(\w+\) (?:Promocionado|Aprobado|Reprobado)/,
			/No aprobad \(No aprobada\) Reprobado/,
			/Aprobada \(Aprobada\) Aprobado/,
			/Ausente/,
		];
		const dateRegex = /\d{2}\/\d{2}\/\d{4}/;
		const historyRowRegex = new RegExp(`^(${Object.keys(typesMap).join("|")}) {1,2}- (${gradesRegex.map(i => i.source).join("|")}) (${dateRegex.source}) - .*Detalle$`);

		return fetchAjaxPageContents("/autogestion/grado/historia_academica/?checks=PromocionA,RegularidadA,RegularidadR,RegularidadU,EnCurso,ExamenA,ExamenR,ExamenU,EquivalenciaA,EquivalenciaR,AprobResA,CreditosA,&modo=anio&param_modo=&e_cu=A&e_ex=A&e_re=A", "info_historia").then(responseText => {
			return $(responseText).find(".catedra_nombre").toArray()
				.map(item => {
					let courseText = $(item).find("h4").text();
					let groups = /\((\d{6})\)/.exec(courseText);
					if (!groups) throw "courseText couldn't be parsed: " + courseText;
					let courseCode = groups[1];

					let historyRow = $(item).find("span").text().trim();
					groups = historyRowRegex.exec(historyRow);
					if (!groups) throw `historyRow couldn't be parsed: ${historyRow}`;
					let type = typesMap[groups[1]];
					let grade = groups[2];
					let isApprovedGrade = (grade.includes("Promocionado") || grade.includes("Aprobad")) && !grade.includes("No aprobad");
					let date = utils.parseDate(groups[3]);

					// Not considering non approved grades for now..
					if (!isApprovedGrade) return null;
					return {
						courseCode: courseCode,
						type: type,
						date: date,
					};
				})
				.filter(course => !!course);
		}).catch(e => {
			trackError(e, "parseAcademicHistory");
			throw e;
		});
	};

	/**
	 * Tries to resolve the starting year in the university for the current student.
	 * @returns {Promise<String>}
	 */
	let getStartYear = function () {
		return parseAcademicHistory().then(courseHistory => {
			return courseHistory
				.map(course => course.date)
				.sort((a, b) => a - b)
				.map(date => date.getFullYear())
				[0];
		}).catch(e => {
			trackError(e, "getStartYear");
			return null;
		});
	};

	/**
	 * Gets all the courses that the student has taken, not including the failed ones.
	 * The returned object contains the signed courses, which includes the ones that have also been passed.
	 * All the passed courses are also included in a different proeprty.
	 * @returns {Promise<{signed: String[], passed: String[]}>}
	 */
	let getPassedCourses = function () {
		return parseAcademicHistory().then(coursesHistory => {
			// For signed courses we condier both passed and signed, and remove duplicates.
			let signedCourses = [...new Set(coursesHistory.map(course => course.courseCode))];
			let passedCourses = coursesHistory.filter(course => course.type === "PASSED").map(course => course.courseCode);
			return {
				passed: passedCourses,
				signed: signedCourses
			};
		}).catch(e => {
			trackError(e, "getPassedCourses");
			throw e;
		});
	};

	/**
	 * Fetches all the current surveys that the user has to take o has taken.
	 * For each of them resolves the current professor name, class, course, quarter, etc.
	 * @returns {Promise<*[]>} an array of class schedules for each combination of professor and class
	 */
	let getProfessorClassesFromSurveys = function () {
		// TODO parse this information once we know where it is.
		return Promise.resolve([]);
	};

	/**
	 * @returns {Promise<*[]>} an array of taken surveys
	 */
	let getTakenSurveys = function () {
		// TODO parse this information once we know where it is.
		return Promise.resolve([]);
	};

	// Public
	return {
		getStartYear: getStartYear,
		getStudentId: getStudentId,
		getClassSchedules: getClassSchedules,

		getStudentPlanCode: getStudentPlanCode,
		getPassedCourses: getPassedCourses,

		getProfessorClassesFromSurveys: getProfessorClassesFromSurveys,
		getTakenSurveys: getTakenSurveys,
	};
};
