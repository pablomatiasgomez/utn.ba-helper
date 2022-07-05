if (!window.UtnBaHelper) window.UtnBaHelper = {};
UtnBaHelper.PagesDataParser = function (apiConnector, utils) {

	// Init pdf.js
	pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL("js/lib/pdf.worker.min.js");

	// We want to fetch only once each page.
	let CACHED_PAGE_CONTENTS = {};

	/**
	 * Fetches and parses the way guarani's page ajax contents are loaded.
	 * Returned contents are different script tags that contain the html, so they need to be parsed.
	 */
	let fetchAjaxPageContents = function (url) {
		if (CACHED_PAGE_CONTENTS[url]) {
			return Promise.resolve(CACHED_PAGE_CONTENTS[url]);
		}
		return fetch(url, {
			"headers": {
				"X-Requested-With": "XMLHttpRequest", // This is needed so that guarani's server returns a json payload
			}
		}).then(response => response.json()).then(response => {
			if (response.cod === "1" && response.titulo === "Grado - Acceso" && response.operacion === "acceso") throw new LoggedOutError();
			if (response.cod === "-2" && response.cont.url.includes("/autogestion/grado/acceso/login")) throw new LoggedOutError();
			if (response.cod !== "1") throw new Error(`Invalid ajax contents for url ${url}. response: ${JSON.stringify(response)}`);
			return response.cont;
		}).then(contents => {
			CACHED_PAGE_CONTENTS[url] = contents;
			return contents;
		});
	};

	/**
	 * Some pages that are requested via ajax return responses that contain an array of items to be
	 * rendered in the UI. This method parses that and returns only the item that is requested (infoId)
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
	 * Fetches an url that returns a pdf and parses the content into an array of strings.
	 * @param url url that returns a pdf.
	 * @returns {Promise<string[]>}
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
		}).catch(e => {
			// Sometimes guarani's backend throws a 500. We want to ignore those errors from being reported to backend.
			if (e instanceof pdfjsLib.UnexpectedResponseException && e.status >= 500) {
				console.error("Failed to fetch pdf", e);
				throw new GuaraniBackendError(e);
			}
			throw e;
		});
	};

	/**
	 * Fetches an url that returns a XLS and returns the parsed workbook
	 * @param url url that returns a XLS.
	 * @returns {Promise<{}>}
	 */
	let fetchXlsContents = function (url) {
		if (CACHED_PAGE_CONTENTS[url]) {
			return Promise.resolve(CACHED_PAGE_CONTENTS[url]);
		}
		return fetch(url).then(response => {
			return response.arrayBuffer();
		}).then(response => {
			return XLSX.read(new Uint8Array(response), {type: "array"});
		}).then(contents => {
			CACHED_PAGE_CONTENTS[url] = contents;
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
	 * Fetches, from the "Comprobante de cursada" pdf, the current classes that the student is taking.
	 * Used for different purposes:
	 * - Collect classSchedules
	 * - Complete the grid when registering to new classes
	 * @returns {Promise<Array<{}>>} array of objects for each class, that contains the schedule for it.
	 */
	let getClassSchedules = function () {
		// TODO delete all this if we confirm that the data is the same.
		// TODO delete also the fetchPdfContents and everything related to pdf.
		let classSchedulesFromPdf = fetchPdfContents("/autogestion/grado/calendario/descargar_comprobante").then(contents => {
			if (contents.length === 1 && contents[0] === "") {
				// If we get an empty pdf it means the student does not have any current class schedules.
				return [];
			}

			// We will iterate pdf contents one by one, validating the structure.
			let i = 0;
			let validateExpectedContents = expectedContents => expectedContents.forEach(expectedContent => {
				if (contents[i++] !== expectedContent) throw new Error(`Invalid pdf contents (${i - 1}): ${JSON.stringify(contents)}`);
			});

			validateExpectedContents(["", "COMPROBANTE DE INSCRIPCIÓN A CURSADA"]);

			// This is not being used right now, but keeping it to validate the contents format.
			// WARN: the studentId is not properly formatted in the pdf, that is why we are considering the check digit as optional.
			// For example, it could be shown as "123.456-" instead of "12.345-6"
			// If we need to use its value, we need to sanitize to the correct format.
			let studentIdAndName = contents[i++];
			let groups = /^(\d{2,3}\.\d{3}-\d?) (.*)$/.exec(studentIdAndName);
			if (!groups) throw new Error(`Couldn't parse studentIdAndName: ${studentIdAndName}. PdfContents: ${JSON.stringify(contents)}`);

			validateExpectedContents(["Código", "Actividad", "Período", "Comisión", "Ubicación", "Aula", "Horario"]);

			let classSchedules = [];
			const yearAndQuarterRegex = /^((1|2)(?:er|do) Cuat|Anual) (\d{4})$/;
			// After all the class schedules rows, this is the following text, so we know where to stop...
			while (contents[i] !== "Firma y Sello Departamento") {
				let courseCode = contents[i++]; // e.g.: 950701
				if (!/^\d{6}$/.test(courseCode)) throw new Error(`courseCode couldn't be parsed: ${courseCode}. PdfContents: ${JSON.stringify(contents)}`);

				let courseName = contents[i++]; // e.g.: Fisica I

				let yearAndQuarter = contents[i++]; // e.g.: 1er Cuat 2021
				groups = yearAndQuarterRegex.exec(yearAndQuarter);
				if (!groups) {
					// Sometimes it can happen that the courseName was long enough that was split into two rows...
					courseName = `${courseName} ${yearAndQuarter}`;
					yearAndQuarter = contents[i++];
					groups = yearAndQuarterRegex.exec(yearAndQuarter);
				}
				if (!groups) throw new Error(`Class time couldn't be parsed: ${yearAndQuarter}. PdfContents: ${JSON.stringify(contents)}`);
				let quarter = (groups[1] === "Anual") ? "A" : (groups[2] + "C"); // A, 1C, 2C
				let year = parseInt(groups[3]);

				let classCode = contents[i++].toUpperCase(); // e.g.: Z1154

				let branch = contents[i++].toUpperCase()
					.replace(" ", "_") // e.g.: CAMPUS, MEDRANO, CAMPUS_VIRTUAL, ESCUELA
					.replace("SEDE_", ""); // Strip out some values like SEDE_CAMPUS or SEDE_MEDRANO
				// TODO reuse what we have in PreInscripcionPage ?
				if (branch === "CAMPUS_VIRTUAL" || branch === "VIRTUAL") {
					branch = "AULA_VIRTUAL";
				} else if (branch === "ESCUELA") {
					// For some reason, this comes as two separate elements, like: ["Escuela", "Técnica -"]
					validateExpectedContents(["Técnica -"]);
					branch = "PIÑERO";
				} else if (branch === "SIN_DESIGNAR") {
					branch = null;
				}

				i++; // (ClassRoomNumber) e.g.: "Sin definir", "2"

				let schedulesStr = contents[i++]; // e.g.: Lu(n)1:5 Mi(n)0:2
				// Sundays is not a valid day, not sure why this is happening, but ignoring..
				let schedules = ["Do(m)0:0", "Do(t)0:0", "Do(n)0:0", "Sin definir"].includes(schedulesStr) ? null : utils.getSchedulesFromString(schedulesStr);

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
			return classSchedules;
		});

		let classSchedulesFromPage = fetchAjaxPageContents("/autogestion/grado/calendario").then(responseContents => {
			let renderData = parseAjaxPageRenderer(responseContents, "agenda_utn");
			return renderData.info.agenda.cursadas.map(cursadaId => {
				let classData = renderData.info.agenda.comisiones[cursadaId];
				return mapClassDataToClassSchedule(classData);
			});
		});

		return Promise.all([
			classSchedulesFromPdf,
			classSchedulesFromPage,
		]).then(results => {
			let fromPdf = results[0];
			let fromPage = results[1];
			fromPdf.sort((cs1, cs2) => parseInt(cs2.courseCode) - parseInt(cs2.courseCode));
			fromPage.sort((cs1, cs2) => parseInt(cs2.courseCode) - parseInt(cs2.courseCode));
			fromPdf.forEach(cs => cs.schedules.sort((sc1, sc2) => (sc1.day + sc1.shift + sc1.firstHour).localeCompare((sc2.day + sc2.shift + sc2.firstHour))))
			fromPage.forEach(cs => cs.schedules.sort((sc1, sc2) => (sc1.day + sc1.shift + sc1.firstHour).localeCompare((sc2.day + sc2.shift + sc2.firstHour))))

			apiConnector.logMessage("compareClassSchedules", false, [
				`[fromPdfCount:${fromPdf.length}]`,
				`[fromPageCount:${fromPage.length}]`,
				`[match:${JSON.stringify(fromPdf) === JSON.stringify(fromPage)}]`,
				`[fromPdf:${JSON.stringify(fromPdf)}]`,
				`[fromPage:${JSON.stringify(fromPage)}]`,
			].join(""));
			return fromPdf; // Still using fromPdf just in case.
		});
	};

	/**
	 * The student's current plan code as shown in the /autogestion/grado/plan_estudio page.
	 * @returns {Promise<string>}
	 */
	let getStudentPlanCode = function () {
		return fetchAjaxPageContents("/autogestion/grado/plan_estudio").then(responseContents => {
			let responseText = parseAjaxPageRenderer(responseContents, "info_plan").content;
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
				let date = utils.parseDate(row["Fecha"]);
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
				let weightedGrade = grade !== null ? utils.getWeightedGrade(date, grade) : null;

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
	 * We can only retrieve the pending professor surveys and not the completed ones.
	 * This returns the siuUrl and the kollaUrl (the actual form)
	 * @returns {Promise<[{siuUrl: string, kollaUrl: string}]>}
	 */
	let getPendingProfessorSurveys = function () {
		return fetchAjaxPageContents("/autogestion/grado/inicio_alumno").then(responseContents => {
			let surveysResponseText = parseAjaxPageRenderer(responseContents, "lista_encuestas_pendientes").content;

			let promises = $(surveysResponseText).find("ul li a").toArray()
				.map(a => a.href)
				.map(siuUrl => {
					return fetchAjaxPageContents(siuUrl).then(siuResponseText => {
						let kollaUrl = $(siuResponseText).find("iframe").get(0).src;
						return {
							siuUrl: siuUrl,
							kollaUrl: kollaUrl,
						};
					});
				});
			return Promise.all(promises).then(surveyUrls => surveyUrls.flat());
		});
	};

	/**
	 * Fetches all the current surveys that the user has to take o has taken.
	 * For each of them resolves the current professor name, class, course, quarter, etc.
	 * @returns {Promise<*[]>} an array of class schedules for each combination of professor and class
	 */
	let getProfessorClassesFromSurveys = function () {
		return getPendingProfessorSurveys().then(surveyUrls => {
			let promises = surveyUrls.map(surveyUrl => {
				let kollaUrl = surveyUrl.kollaUrl;
				return utils.backgroundFetch(kollaUrl).then(kollaResponseText => {
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
			quarter: quarter,
			year: year,
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

	let mapClassDataToClassSchedule = function (classData) {
		try {
			let period = parsePeriodTxt(classData.periodo_nombre);
			let branch = parseBranchTxt(classData.ubicacion_nombre);
			let schedules = utils.getSchedulesFromArray(classData.horas_catedra);  // TODO move this out of utils?
			return {
				year: period.year,
				quarter: period.quarter,
				courseName: classData.actividad_nombre,
				classCode: classData.comision_nombre,
				courseCode: classData.actividad_codigo,
				branch: branch,
				schedules: schedules,
			};
		} catch (e) {
			throw utils.wrapError(`Couldn't parse classData: ${JSON.stringify(classData)}`, e);
		}
	}

	/**
	 * Parses the responseText of the Kolla forms, and returns the survey form data along with the answers.
	 * @return {[{professorRole: string, classCode: string, year: number, courseCode: string, professorName: string, surveyKind: string, quarter}]}
	 */
	let parseKollaSurveyForm = function ($kollaResponseText) {
		const surveyKindsMapping = {
			"DOCENTE": "DOCENTE",
			"AUXILIARES DOCENTES": "AUXILIAR",
		};
		const quarterMapping = {
			"PRIMER CUATRIMESTRE": "1C",
			"SEGUNDO CUATRIMESTRE": "2C",
			"ANUAL": "A",
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
		getStudentId: getStudentId,
		getClassSchedules: getClassSchedules,

		getStudentPlanCode: getStudentPlanCode,
		getCoursesHistory: getCoursesHistory,

		getPendingProfessorSurveys: getPendingProfessorSurveys,
		getProfessorClassesFromSurveys: getProfessorClassesFromSurveys,

		// Exposed parsers / mappers
		parseKollaSurveyForm: parseKollaSurveyForm,
		mapClassDataToClassSchedule: mapClassDataToClassSchedule,
	};
};
