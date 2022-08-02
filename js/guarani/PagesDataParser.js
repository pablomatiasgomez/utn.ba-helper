if (!window.UtnBaHelper) window.UtnBaHelper = {};
UtnBaHelper.PagesDataParser = function (utils) {

	// We want to fetch only once each page.
	let RESPONSES_CACHE = {};

	/**
	 * Fetches and parses the way guarani's page ajax contents are loaded.
	 */
	let fetchAjaxContents = function (url, useCache = true) {
		if (useCache && RESPONSES_CACHE[url]) {
			return Promise.resolve(RESPONSES_CACHE[url]);
		}
		return fetch(url, {
			"headers": {
				"X-Requested-With": "XMLHttpRequest", // This is needed so that guarani's server returns a json payload
			}
		}).then(response => response.json()).then(response => {
			if (response.cod === "1" && response.titulo === "Grado - Acceso" && response.operacion === "acceso") throw new LoggedOutError();
			if (response.cod === "-2" && response.cont.url.includes("/autogestion/grado/acceso/login")) throw new LoggedOutError();
			if (response.cod === "-1" && response.cont === "error") throw new GuaraniBackendError(response);
			if (response.cod !== "1") throw new Error(`Invalid ajax contents for url ${url}. response: ${JSON.stringify(response)}`);
			return response;
		}).then(contents => {
			RESPONSES_CACHE[url] = contents;
			return contents;
		});
	};

	/**
	 * Some pages that are requested via ajax return responses that contain an array of items to be
	 * rendered in the UI, which are different script tags that contain the html, so they need to be parsed.
	 * This method parses that and returns only the item that is requested (infoId)
	 * @param responseContents the "cont" object of the ajax call.
	 * @param infoId the infoId to filter the elements out.
	 */
	let parseAjaxPageRenderer = function (responseContents, infoId) {
		let renderData = $(responseContents).filter("script").toArray()
			.map(script => $(script).html())
			.filter(script => script.startsWith("kernel.renderer.on_arrival"))
			.map(script => JSON.parse(script.replace("kernel.renderer.on_arrival(", "").replace(");", "")))
			.filter(data => data.info.id === infoId);
		if (renderData.length !== 1) throw new Error(`Found unexpected number of renderers: ${renderData.length} for infoId: ${infoId}. response: ${JSON.stringify(responseContents)}`);
		return renderData[0];
	};

	/**
	 * Fetches an url that returns a XLS and returns the parsed workbook
	 * @param url url that returns a XLS.
	 * @returns {Promise<{}>}
	 */
	let fetchXlsContents = function (url) {
		if (RESPONSES_CACHE[url]) {
			return Promise.resolve(RESPONSES_CACHE[url]);
		}
		return fetch(url).then(response => {
			return response.arrayBuffer();
		}).then(response => {
			return XLSX.read(new Uint8Array(response), {type: "array"});
		}).then(contents => {
			RESPONSES_CACHE[url] = contents;
			return contents;
		});
	};

	// --------------------

	/**
	 * Tries to resolve and return the student id for the current logged-in user.
	 * @returns {Promise<String>}
	 */
	let getStudentId = function () {
		let studentId = $(".legajo-container .legajo-numero").text().trim();
		if (studentId[studentId.length - 2] !== "-" || studentId[studentId.length - 6] !== ".") throw new Error(`Invalid studentId: ${studentId}`);
		return Promise.resolve(studentId);
	};

	/**
	 * Fetches, from the "Agenda" page, the current classes that the student is taking.
	 * Used to collect the classSchedules
	 * @returns {Promise<Array<{}>>} array of objects for each class, that contains the schedule for it.
	 */
	let getClassSchedules = function () {
		return fetchAjaxContents("/autogestion/grado/calendario").then(responseContents => {
			let renderData = parseAjaxPageRenderer(responseContents.cont, "agenda_utn");
			return renderData.info.agenda.cursadas.map(cursadaId => {
				let classData = renderData.info.agenda.comisiones[cursadaId];
				return mapClassDataToClassSchedule(classData);
			});
		});
	};

	/**
	 * The student's current plan code as shown in the /autogestion/grado/plan_estudio page.
	 * @returns {Promise<string>}
	 */
	let getStudentPlanCode = function () {
		return fetchAjaxContents("/autogestion/grado/plan_estudio").then(responseContents => {
			let responseText = parseAjaxPageRenderer(responseContents.cont, "info_plan").content;
			let planText = $(responseText).filter(".encabezado").find("td:eq(1)").text();
			let groups = /^Plan: \((\w+)\)/.exec(planText);
			if (!groups) throw new Error(`planText couldn't be parsed: ${planText}`);
			return groups[1];
		});
	};

	/**
	 * Parses and returns all the student's academic history. Includes courses and final exams (both passed and failed)
	 * @returns {Promise<{courses: [{courseCode: string, isPassed: boolean, grade: number, weightedGrade: number, date: Date}], finalExams: [{courseCode: string, isPassed: boolean, grade: number, weightedGrade: number, date: Date}]}>}
	 */
	let getCoursesHistory = function () {
		let courses = [];
		let finalExams = [];
		// Use a map to also validate returned types.
		let arrayByTypes = {
			"En curso": courses,
			"Regularidad": courses,
			"Promocion": finalExams,
			"Examen": finalExams,
			"Equivalencia": finalExams,
		};
		const gradeIsPassedTypes = {
			"Promocionado": true,
			"Aprobado": true,
			"Reprobado": false,
			"Ausente": false,
		};
		return fetchXlsContents("/autogestion/grado/historia_academica/exportar_xls/?checks=PromocionA,RegularidadA,RegularidadR,RegularidadU,EnCurso,ExamenA,ExamenR,ExamenU,EquivalenciaA,EquivalenciaR,AprobResA,CreditosA,&modo=anio&param_modo=").then(workbook => {
			let sheet = workbook.Sheets["Reporte"];
			if (!sheet) throw new Error(`Workbook does not contain sheet. Sheetnames: ${workbook.SheetNames}`);

			// First 5 rows do not include important data:
			if (sheet.A6.v !== "Fecha") throw new Error(`Invalid sheet data: ${JSON.stringify(XLSX.utils.sheet_to_json(sheet))}`);
			sheet["!ref"] = sheet["!ref"].replace("A1:", "A6:");

			XLSX.utils.sheet_to_json(sheet).forEach(row => {
				let date = parseDate(row["Fecha"]);
				let courseText = row["Actividad"];
				let type = row["Tipo"];
				let gradeText = row["Nota"];
				let gradeIsPassedText = row["Resultado"];

				if (!gradeText || !gradeIsPassedText) return; // Ignore non finished items

				let groups = /(.*) \((\d{6})\)/.exec(courseText);
				if (!groups) throw new Error(`courseText couldn't be parsed: ${courseText}. Row: ${JSON.stringify(row)}`);
				let courseCode = groups[2];

				let arr = arrayByTypes[type];
				if (!arr) throw new Error(`Type not handled: ${type}. Row: ${JSON.stringify(row)}`);

				let grade = parseInt(gradeText) || null;
				let weightedGrade = grade !== null ? getWeightedGrade(date, grade) : null;

				if (typeof gradeIsPassedTypes[gradeIsPassedText] === "undefined") throw new Error(`gradeIsPassedText couldn't be parsed: ${gradeIsPassedText}. Row: ${JSON.stringify(row)}`);
				let isPassed = gradeIsPassedTypes[gradeIsPassedText];

				arr.push({
					courseCode: courseCode,
					isPassed: isPassed,
					grade: grade,
					weightedGrade: weightedGrade,
					date: date,
				});
			});
			return {
				courses: courses,
				finalExams: finalExams,
			};
		});
	};

	/**
	 * Fetches all the current surveys that the user has to take (cannot retrieve the ones that have already been taken)
	 * For each of them resolves the current professor name, class, course, quarter, etc.
	 * @returns {Promise<*[]>} an array of class schedules for each combination of professor and class
	 */
	let getProfessorClassesFromSurveys = function () {
		return fetchAjaxContents("/autogestion/grado/inicio_alumno").then(responseContents => {
			let surveysResponseText = parseAjaxPageRenderer(responseContents.cont, "lista_encuestas_pendientes").content;

			let promises = $(surveysResponseText).find("ul li a").toArray()
				.map(a => a.href)
				.map(siuUrl => {
					return fetchAjaxContents(siuUrl).then(siuResponseText => {
						// Return the kollaUrl
						return $(siuResponseText.cont).find("iframe").get(0).src;
					});
				});
			return Promise.all(promises).then(kollaUrls => kollaUrls.flat());
		}).then(kollaUrls => {
			let promises = kollaUrls.map(kollaUrl => {
				return utils.backgroundFetch({url: kollaUrl}).then(kollaResponseText => {
					let surveysMetadata = parseKollaSurveyForm($(kollaResponseText));

					// We could eventually merge same class professors, but the backend still accepts this:
					return surveysMetadata.map(surveyMetadata => {
						return {
							year: surveyMetadata.year,
							quarter: surveyMetadata.quarter,
							classCode: surveyMetadata.classCode,
							courseCode: surveyMetadata.courseCode,
							professors: [
								{
									name: surveyMetadata.professorName,
									kind: surveyMetadata.surveyKind,
									role: surveyMetadata.professorRole,
								}
							]
						};
					});
				});
			});
			return Promise.all(promises).then(surveys => surveys.flat());
		});
	};

	// --------------------

	// Parses a date with format DD/MM/YYYY
	let parseDate = function (dateStr) {
		let dateParts = dateStr.split("/");
		return new Date(dateParts[2], dateParts[1] - 1, dateParts[0]);
	};

	let getWeightedGrade = function (date, grade) {
		if (date < UtnBaHelper.Consts.NEW_GRADES_REGULATION_DATE) {
			return UtnBaHelper.Consts.WEIGHTED_GRADES[grade];
		} else {
			return grade;
		}
	};

	/**
	 * Parses a period with the form `Grado Primer Cuatrimestre 2022` into an object that contains the year and quarter.
	 * @param periodTxt
	 * @returns {{year: number, quarter: string}}
	 */
	let parsePeriodTxt = function (periodTxt) {
		const quarterTxtMapping = {
			"Anual": "A",
			"Primer Cuatrimestre": "1C",
			"Segundo Cuatrimestre": "2C",
			"ASS": "A", // Weird case, was found in "Grado ASS 2022" (seems to be specific to courseCode: 950454)
		};
		const yearAndQuarterRegex = new RegExp(`^Grado (${Object.keys(quarterTxtMapping).join("|")}) (\\d{4})$`);
		let groups = yearAndQuarterRegex.exec(periodTxt);
		if (!groups) throw new Error(`Class period couldn't be parsed: ${periodTxt}`);
		let quarter = quarterTxtMapping[groups[1]];
		let year = parseInt(groups[2]);
		return {
			year: year,
			quarter: quarter,
		};
	};

	let parseBranchTxt = function (branchTxt) {
		const branchTxtMapping = {
			"Sede Medrano": "MEDRANO",
			"Sede Campus": "CAMPUS",
			"Virtual": "AULA_VIRTUAL",
		};
		let branch = branchTxtMapping[branchTxt];
		if (!branch) throw new Error(`Branch txt couldn't be parsed: ${branchTxt}`);
		return branch;
	};

	/**
	 * New (or different) version of the schedules, represented in the form of:
	 * [
	 * 		{dia_semana: "Lunes", hora_catedra_inicio: "16", hora_catedra_fin: "19"},
	 * 		{dia_semana: "Jueves", hora_catedra_inicio: "16", hora_catedra_fin: "19"}
	 * ]
	 * @param arr the schedule received from the classData struct (guarani's server)
	 * @returns {{day: string, shift: string, firstHour: number, lastHour: number}[]}
	 */
	let parseSchedulesFromArray = function (arr) {
		return arr.map(schedule => {
			let day = Object.entries(UtnBaHelper.Consts.DAYS).filter(entry => entry[1] === schedule.dia_semana).map(entry => entry[0])[0];
			if (!day) throw new Error(`Couldn't parse day: ${schedule.dia_semana}`);

			let shiftIdx = Math.floor((parseInt(schedule.hora_catedra_inicio) - 1) / 7); // 0:MORNING, 1:AFTERNOON, 2:NIGHT
			let shift = Object.keys(UtnBaHelper.Consts.HOURS)[shiftIdx];
			let firstHour = (parseInt(schedule.hora_catedra_inicio) - 1) % 7;
			let lastHour = (parseInt(schedule.hora_catedra_fin) - 1) % 7;
			return {
				day: day,
				shift: shift,
				firstHour: firstHour,
				lastHour: lastHour,
			};
		});
	};


	let mapClassDataToClassSchedule = function (classData) {
		try {
			let period = parsePeriodTxt(classData.periodo_nombre);
			let branch = parseBranchTxt(classData.ubicacion_nombre);
			let schedules = parseSchedulesFromArray(classData.horas_catedra);
			return {
				year: period.year,
				quarter: period.quarter,
				classCode: classData.comision_nombre.toUpperCase(),
				courseCode: classData.actividad_codigo,
				// courseName is not used right now.
				// The backend does not accept this for posts (class schedules or previous professors),
				// so if we decide to add it, we should remove it from api calls.
				// courseName: classData.actividad_nombre,
				branch: branch,
				schedules: schedules,
			};
		} catch (e) {
			throw utils.wrapError(`Couldn't parse classData: ${JSON.stringify(classData)}`, e);
		}
	}

	/**
	 * Parses the responseText of the Kolla forms, and returns the survey form data along with the answers.
	 * @returns {[{surveyKind: string, professorRole: string, classCode: string, year: number, courseCode: string, professorName: string, quarter: string, surveyFieldValues: []}]}
	 */
	let parseKollaSurveyForm = function ($kollaResponseText) {
		const surveyKindsMapping = {
			"DOCENTE": "DOCENTE",
			"AUXILIARES DOCENTES": "AUXILIAR",
			"DOCENTES AUXILIARES": "AUXILIAR",
		};
		const quarterMapping = {
			"ANUAL": "A",
			"PRIMER CUATRIMESTRE": "1C",
			"SEGUNDO CUATRIMESTRE": "2C",
			"ASS": "A", // Weird case, was found in "ENCUESTA DOCENTES AUXILIARES ASS 2022"
		};
		const surveyTitleRegex = new RegExp(`^ENCUESTA (${Object.keys(surveyKindsMapping).join("|")}) (${Object.keys(quarterMapping).join("|")}) (\\d{4})$`);

		const professorRolesMapping = {
			"Titular": "TITULAR",
			"Asociado": "ASOCIADO",
			"Adjunto": "ADJUNTO",

			"JTP": "JEFE DE TP",
			"Ayudante de 1ra": "AYUDANTE 1RA",
			"Ayudante de 2da": "AYUDANTE 2DA",
		};
		const professorRegex = new RegExp(`^(.*) \\((${Object.keys(professorRolesMapping).join("|")})(?: \\(Responsable de Cátedra\\))?\\)$`);

		let courseTitle = $kollaResponseText.find(".formulario-titulo").text(); // E.g.: 'Simulación (082041) - Comisión: K4053', 'Administración Gerencial (082039) - Comisión: K5054'
		let groups = /^(.*) \((\d{6})\) - Comisión: ([\w\d]{5})$/.exec(courseTitle);
		if (!groups) throw new Error(`Survey courseTitle couldn't be parsed: ${courseTitle}`);
		// let courseName = groups[1]; // E.g. Simulación
		let courseCode = groups[2]; // E.g. 082041
		let classCode = groups[3]; // E.g. K4053

		return $kollaResponseText.find(".encuesta").toArray().map(surveyDiv => {
			let $surveyDiv = $(surveyDiv);

			let surveyTitle = $surveyDiv.find(".encuesta-titulo");
			surveyTitle = surveyTitle.text().trim();

			groups = surveyTitleRegex.exec(surveyTitle);
			if (!groups) throw new Error(`surveyTitle couldn't be parsed: ${surveyTitle}`);

			let surveyKind = surveyKindsMapping[groups[1]]; // DOCENTE, AUXILIAR
			let quarter = quarterMapping[groups[2]]; // A, 1C, 2C
			let year = parseInt(groups[3]); // 2018, 2019, ...

			let professor = $surveyDiv.find(".encuesta-elemento h3");
			professor = professor.text().trim();

			groups = professorRegex.exec(professor);
			if (!groups) throw new Error(`professor couldn't be parsed: ${professor}`);

			let professorName = groups[1].toUpperCase();
			let professorRole = professorRolesMapping[groups[2]]; // TITULAR, ASOCIADO, ADJUNTO, etc.

			let surveyFieldValues = $surveyDiv.find(".panel-info .panel-body .form-group").toArray()
				.map(item => {
					let $item = $(item);
					let $questionLabel = $item.find("> label");

					let question = $questionLabel.text().replace("*", "").trim();
					let value = null;

					let labelFor = $questionLabel.attr("for");
					let $answerElement = $item.find(`[name=${labelFor}]`);
					if ($answerElement.is("textarea")) {
						value = $answerElement.val() || null;
					} else if ($answerElement.is("input")) {
						value = parseInt($answerElement.filter(":checked").parent().text());
						value = isNaN(value) ? null : value;
					} else {
						throw new Error(`Couldn't parse value for question ${question}. Item: ${$item.html()}`);
					}
					return {
						question: question,
						value: value,
					};
				});

			return {
				surveyKind: surveyKind,
				year: year,
				quarter: quarter,
				classCode: classCode,
				courseCode: courseCode,
				professorName: professorName,
				professorRole: professorRole,

				surveyFieldValues: surveyFieldValues, // Only used for posting surveys, not professor classes.
			};
		});
	};

	// Public
	return {
		fetchAjaxContents: fetchAjaxContents,

		// --

		getStudentId: getStudentId,
		getClassSchedules: getClassSchedules,

		getStudentPlanCode: getStudentPlanCode,
		getCoursesHistory: getCoursesHistory,

		getProfessorClassesFromSurveys: getProfessorClassesFromSurveys,

		// Exposed parsers / mappers
		parseKollaSurveyForm: parseKollaSurveyForm,
		mapClassDataToClassSchedule: mapClassDataToClassSchedule,
	};
};
