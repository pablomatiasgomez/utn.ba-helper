let PagesDataParser = function (utils, apiConnector) {

	let trackError = function (error, methodName) {
		console.error("Error at " + methodName, error);
		return apiConnector.logMessage(methodName, true, utils.stringifyError(error));
	};

	// We want to fetch only once each page.
	let CACHED_PAGE_CONTENTS = {};
	let getPageContents = function (url) {
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
	let getAjaxPageContents = function (url, infoId) {
		return getPageContents(url).then(responseText => {
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
	 * Fetches, from the register pdf, the current classes that the student is having, along with the studentId.
	 * Used for different puprposes:
	 * - Know the studentId
	 * - Collect classSchedules
	 * - Complete the grid when registering to new classes
	 * @return {Promise<{studentId: String, classSchedules: Array<{}>}>}
	 */
	let parseCurrentClassSchedules = function () {
		let url = "https://guarani.frba.utn.edu.ar/autogestion/grado/calendario/descargar_comprobante";
		if (CACHED_PAGE_CONTENTS[url]) {
			return Promise.resolve(CACHED_PAGE_CONTENTS[url]);
		}
		// noinspection JSValidateTypes
		return pdfjsLib.getDocument(url).promise.then(pdf => {
			let promises = Array.from(Array(pdf.numPages).keys())
				.map(i => pdf.getPage(i + 1)
					.then(page => page.getTextContent())
					.then(text => text.items.map(s => s.str)));
			return Promise.all(promises)
				.then(contents => contents.flat())
				.then(contents => {
					// We will iterate pdf contents one by one, validating the structure.
					let i = 0;
					let validateExpectedContents = expectedContents => expectedContents.forEach(expectedContent => {
						if (contents[i++] !== expectedContent) throw `Invalid pdf contents (${i - 1}): ${JSON.stringify(contents)}`;
					});

					validateExpectedContents(["", "COMPROBANTE DE INSCRIPCIÓN A CURSADA"]);

					let studentIdAndName = contents[i++];
					let groups = /^(\d{3}\.\d{3}-\d) ([\w, À-ú]+)$/.exec(studentIdAndName);
					if (!groups) throw `Couldn't parse studentIdAndName: ${studentIdAndName}`;
					let studentId = groups[1];

					validateExpectedContents(["Código", "Actividad", "Período", "Comisión", "Ubicación", "Aula", "Horario"]);

					// After class schedules row, the this is the following text so we know where to stop.
					let classSchedules = [];
					while (contents[i] !== "Firma y Sello Departamento") {
						let courseCode = contents[i++];									// e.g.: 950701
						let courseName = contents[i++];									// e.g.: Fisica I
						let yearAndQuarter = contents[i++]; 							// e.g.: 1er Cuat 2021
						let classCode = contents[i++].toUpperCase();					// e.g.: Z1154
						let branch = contents[i++].toUpperCase().replace(" ", "_");  	// e.g.: CAMPUS, MEDRANO, AULA_VIRTUAL
						i++; 															// (ClassRoomnumber) e.g.: "Sin definir"
						let schedulesStr = contents[i++];								// e.g.: Lu(n)1:5 Mi(n)0:2

						groups = /^((1|2)(?:er|do) Cuat|Anual) (\d{4})$/.exec(yearAndQuarter);
						if (!groups) throw `Class time couldn't be parsed: ${yearAndQuarter}. PdfContents: ${JSON.stringify(contents)}`;
						let quarter = (groups[1] === "Anual") ? "A" : (groups[2] + "C"); // A, 1C, 2C
						let year = parseInt(groups[3]);

						// Sundays is not a valid day, not sure why this is happening, but ignoring..
						let schedules = schedulesStr === "Do(m)0:0" ? null : utils.getSchedulesFromString(schedulesStr);

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

					CACHED_PAGE_CONTENTS[url] = {
						studentId: studentId,
						classSchedules: classSchedules,
					};
					return CACHED_PAGE_CONTENTS[url];
				});
		}).catch(e => {
			trackError(e, "parseCurrentClassSchedules");
			throw e;
		});
	};

	/**
	 * Tries to resolve the starting year in the university for the current student.
	 * @return {Promise<String>}
	 */
	let getStartYear = function () {
		return getAjaxPageContents("/autogestion/grado/historia_academica/?checks=PromocionA,RegularidadA,RegularidadR,RegularidadU,EnCurso,ExamenA,ExamenR,ExamenU,EquivalenciaA,EquivalenciaR,AprobResA,CreditosA,&modo=anio&param_modo=&e_cu=A&e_ex=A&e_re=A", "info_historia").then(responseText => {
			let dates = $(responseText).find(".catedra_nombre span").toArray()
				.map(span => {
					let historyRow = $(span).text().trim();
					let groups = /^(En curso|Regularidad|Promoción|Examen)  - (Inicio de dictado|\d{1,2} \(\w+\) (?:Promocionado|Aprobado|Reprobado)|No aprobad \(No aprobada\) Reprobado|Aprobada \(Aprobada\) Aprobado|Ausente) (\d{2}\/\d{2}\/\d{4})/.exec(historyRow);
					if (!groups) throw `historyRow couldn't be parsed: ${historyRow}`;
					return utils.parseDate(groups[3]);
				})
				.sort((a, b) => a - b);
			return dates[0].getFullYear();
		}).catch(e => {
			trackError(e, "getStartYear");
			return null;
		});
	};

	/**
	 * Tries to resolve and return the student id for the current logged in user.
	 * @return {Promise<String>}
	 */
	let getStudentId = function () {
		return parseCurrentClassSchedules().then(response => response.studentId);
	};

	/**
	 * Fetches the current classes that the student is having in order to know the schedules of them.
	 * Also used to complete the grid when registering to new classes
	 * @return an array of objects for each class, that contains the schedule for it.
	 */
	let getClassSchedules = function () {
		return parseCurrentClassSchedules().then(response => response.classSchedules);
	};

	/**
	 * The student's current plan code as shown in the /autogestion/grado/plan_estudio page.
	 * @return {Promise<String>}
	 */
	let getStudentPlanCode = function () {
		return getAjaxPageContents("/autogestion/grado/plan_estudio", "info_plan").then(responseText => {
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
	 * Gets all the courses that the student has taken, not including the failed ones.
	 * The returned object contains the signed courses, which includes the ones that have also been passed.
	 * All the passed courses are also included in a different proeprty.
	 * @return {Promise<{signed: Array<String>, passed: Array<String>}>}
	 */
	let getPassedCourses = function () {
		return getAjaxPageContents("/autogestion/grado/historia_academica/?checks=PromocionA,RegularidadA,RegularidadR,RegularidadU,EnCurso,ExamenA,ExamenR,ExamenU,EquivalenciaA,EquivalenciaR,AprobResA,CreditosA,&modo=anio&param_modo=&e_cu=A&e_ex=A&e_re=A", "info_historia").then(responseText => {
			let passedCourses = [];
			let signedCourses = [];

			$(responseText).find(".catedra_nombre").toArray()
				.forEach(item => {
					let courseText = $(item).find("h4").text();
					let groups = /\((\d{6})\)/.exec(courseText);
					if (!groups) throw "courseText couldn't be parsed: " + courseText;
					let courseCode = groups[1];

					let historyRow = $(item).find("span").text().trim();
					groups = /^(En curso|Regularidad|Promoción|Examen)  - (Inicio de dictado|\d{1,2} \(\w+\) (?:Promocionado|Aprobado|Reprobado)|No aprobad \(No aprobada\) Reprobado|Aprobada \(Aprobada\) Aprobado|Ausente) (\d{2}\/\d{2}\/\d{4})/.exec(historyRow);
					if (!groups) throw `historyRow couldn't be parsed: ${historyRow}`;
					let type = groups[1]; // (En curso|Regularidad|Promoción|Examen)
					let grade = groups[2]; // (Inicio de dictado|\d{1,2} \(\w+\) (?:Promocionado|Aprobado|Reprobado)|No aprobad \(No aprobada\) Reprobado|Aprobada \(Aprobada\) Aprobado|Ausente)
					let isPassedGrade = (grade.includes("Promocionado") || grade.includes("Aprobado")) && !grade.includes("No aprobad");

					if (isPassedGrade) {
						if (type === "Promoción" || type === "Examen") {
							passedCourses.push(courseCode);
							signedCourses.push(courseCode);
						} else if (type === "Regularidad") {
							signedCourses.push(courseCode);
						}
					}
				});

			// Remove duplicates
			signedCourses = [...new Set(signedCourses)];
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
	 * @return an array of class schedules for each combination of professor and class
	 */
	let getProfessorClassesFromSurveys = function () {
		// TODO parse this information once we know where it is.
		return Promise.resolve([]);
	};

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
