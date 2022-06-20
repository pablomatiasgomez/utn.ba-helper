if (!window.UtnBaHelper) window.UtnBaHelper = {};
UtnBaHelper.PagesDataParser = function (utils) {

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
		let contents = $(responseContents).filter("script").toArray()
			.map(script => $(script).html())
			.filter(script => script.startsWith("kernel.renderer.on_arrival"))
			.map(script => JSON.parse(script.replace("kernel.renderer.on_arrival(", "").replace(");", "")))
			.filter(data => data.info.id === infoId)
			.map(data => data.content);
		if (contents.length !== 1) throw new Error(`Found unexpected number of page contents: ${contents.length} for infoId: ${infoId}. response: ${JSON.stringify(responseContents)}`);
		return contents[0];
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
			if (e instanceof pdfjsLib.UnexpectedResponseException && e.status === 500) {
				console.error("Failed to fetch pdf", e);
				throw new GuaraniBackendError(e);
			}
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
		return fetchPdfContents("/autogestion/grado/calendario/descargar_comprobante").then(contents => {
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
	};

	/**
	 * The student's current plan code as shown in the /autogestion/grado/plan_estudio page.
	 * @returns {Promise<string>}
	 */
	let getStudentPlanCode = function () {
		return fetchAjaxPageContents("/autogestion/grado/plan_estudio").then(responseContents => {
			let responseText = parseAjaxPageRenderer(responseContents, "info_plan");
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
			let surveysResponseText = parseAjaxPageRenderer(responseContents, "lista_encuestas_pendientes");

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
					let $kollaResponseText = $(kollaResponseText);
					let surveysMetadata = parseKollaSurveyForm($kollaResponseText, kollaResponseText);

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

	/**
	 * Parses the responseText of the Kolla forms, and returns the survey form data along with the answers.
	 * @return {[{professorRole: string, classCode: string, year: number, courseCode: string, professorName: string, surveyKind: string, quarter}]}
	 */
	let parseKollaSurveyForm = function ($kollaResponseText, htmlForLog) {
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

		// TODO temporarily legacy mapping until we use a enum for this.
		//  We should also use the new enum in the ProfessorsSearchCustomPage for the colors of the text questions.
		// noinspection JSNonASCIINames,SpellCheckingInspection,NonAsciiCharacters
		const questionsMapping = {
			// DOCENTE:
			"¿Presenta la planificación de su asignatura al inicio del ciclo lectivo y luego la cumple?": "Presenta la planificación de su asignatura al inicio del ciclo lectivo y luego la cumple.",
			"¿Planifica el desarrollo de los temas?": "Planifica el desarrollo de los temas",
			"¿El docente explica los temas en forma clara y comprensible? (exposiciones organizadas y respuestas precisas)": "Explica los temas en forma clara y comprensible (exposiciones organizadas y respuestas precisas)",
			"¿Trata correctamente a los estudiantes? (respeto, comunicación adecuada)": "Trata correctamente a los estudiantes (respeto, comunicación adecuada)",
			"¿Demuestra seguridad en el tratamiento de los temas?": "Demuestra seguridad en el tratamiento de los temas",
			"¿Desarrolla todos los contenidos del programa?": "Desarrolla todos los contenidos del programa",
			"¿Asiste regularmente a clases?": "Asistencia regular a las clases",
			"¿Emplea material didáctico de la asignatura que sea útil y accesible?": "Emplea  material didáctico de la asignatura útil y accesible",
			"¿Los temas de los parciales concuerdan con los contenidos desarrollados en clase?": "Los temas de los parciales concuerdan con los contenidos desarrollados en clase",
			"¿Da a conocer la forma de evaluación que se va a aplicar en la asignatura?": "Da a conocer la forma de evaluación que se va a aplicar en la asignatura",
			"¿Da a conocer las fechas de los parciales con anticipación respetando el Calendario Académico?": "Da a conocer las fechas de los parciales con anticipación respetando el Calendario Académico",
			"¿Satisface dudas o consultas que surgen en clase?": "Satisface dudas o consultas que surgen en la clase",
			"¿Dedica tiempo suficiente a la ejercitación de los temas desarrollados?": "Dedica tiempo suficiente a la ejercitación de los temas desarrollados",
			"¿Lidera el desarrollo de la asignatura tanto en sus aspectos teóricos como prácticos?": "¿El profesor lidera el desarrollo de la asignatura tanto en sus aspectos teóricos como prácticos?",
			"¿Cumple con las fechas establecidas en el Calendario Académico?": "Cumplimiento con las fechas establecidas en el Calendario Académico",
			"¿Utiliza diversos recursos para la enseñanza? (guía de trabajos, pizarra, presentaciones, proyector, videos, software, hardware, aula virtual, otros)": "Utiliza distintos recursos para la enseñanza (pizarra, presentaciones, proyector, guías de trabajos, videos, software, hardware, Aula Virtual, otros)",
			"¿La bibliografía es actualizada y accesible?": "La bibliografía es actualizada y accesible",
			"¿Es puntual al llegar y al retirarse de las clases?": "Puntualidad al llegar y al retirarse de las clases",
			"¿Favorece la participación de los estudiantes?": "Favorece la participación de los estudiantes",
			"¿Las evaluaciones se llevan a cabo según la reglamentación vigente?": "¿las evaluaciones se llevan a cabo según la reglamentación vigente?",
			"¿Logró continuidad en el cursado y estudio de la asignatura? (estudiar regularmente, participación en clase, asistencia, puntualidad)": "Logró continuidad en el cursado y estudio de la asignatura (estudiar regularmente, asistencia, puntualidad, participación en clase",
			"¿Relaciona los contenidos con otras asignaturas de la carrera?": "Relaciona los contenidos con otras asignaturas de la carrera.",
			"¿Tuvo posibilidad de aplicar sus conocimientos previos durante el cursado de esta materia?": "Tuvo posibilidad de aplicar sus conocimientos previos durante el cursado de esta materia. (contestar cuando corresponda)",

			"Mencione las características del docente que ayudaron en su aprendizaje": "Mencione las características del docente que ayudaron en su  aprendizaje",
			"Realice las observaciones y aclaraciones que crea convenientes sobre las puntuaciones asignadas": "Realice las observaciones y aclaraciones que crea convenientes sobre  las puntuaciones asignadas",
			"Mencione los aspectos del proceso de enseñanza que deberían mejorarse": "Mencione los aspectos del proceso de enseñanza que deberían mejorarse",

			// AUXILIAR:
			"¿Trata de relacionar los contenidos de la asignatura con la actividad profesional?": "¿Trata de relacionar los contenidos de la asignatura con la actividad profesional?",
			"¿Trata de relacionar la teoría con los contenidos de las actividades prácticas?": "¿Trata de relacionar la teroría con los contenidos de las actividades prácticas?",
			"¿Las clases estuvieron correctamente planificadas por el auxiliar?": "Las clases ¿Estuvieron correctamente planificadas por el auxiliar?",
			"¿Es puntual?": "El Auxiliar ¿Es puntual?",
			"¿Orienta sobre el uso de bibliografía de la cátedra?": "¿Orienta sobre el uso de bibliografía de la cátedra?",
			"¿El auxiliar participa adecuadamente en el desarrollo de la clase, resolución de problemas o trabajos prácticos?": "El auxiliar ¿Participa adecuadamente en el desarrollo de la clase, resolución de problemas o trabajos prácticos?",
			"Al momento de realizar los trabajos prácticos ¿Tiene la preparación previa adecuada?": "Al momento de realizar los trabajos prácticos ¿Tiene la preparación previa adecuada?",
			"¿El auxiliar asiste regularmente a las clases teóricas y prácticas?": "El auxiliar ¿Asiste regularmente a las clases teóricas y prácticas?",
			"En caso de corresponder: ¿Promueve el trabajo en equipo?": "En caso de corresponder ¿Promueve el trabajo en equipo?",
			"¿Cómo evalúa ud. el trato del auxiliar con los alumnos?": "¿Cómo evalúa Ud. el trato del auxiliar con los alumnos?",
			"La resolución de trabajos prácticos y/o experiencias de laboratorio ¿Permitió comprender mejor la materia?": "La resolución de trabajos prácticos y/o experiencias de laboratorio ¿Permitió comprender mejor la materia?",
			"¿Promueve la participación de los estudiantes en las clases?": "¿Promueve la participación de los estudiantes en las clases?",
			"¿Prepara material didáctico para el desarrollo de las clases?": "¿Prepara material didáctico para el desarrollo de las clases?",
			"¿Responde las consultas planteadas por los alumnos?": "¿Responde las consultas planteadas por los alumnos?",

			"Mencione los aspectos del proceso de enseñanza referidos a los trabajos prácticos del aula, que pueden mejorarse.": "Mencione los aspectos del proceso de enseñanza referidos a los trabajos Prácticos del aula, que pueden mejorarse.",
			"Realice las observaciones que crea conveniente.": "Realice las observaciones que crea conveniente.",
			"Mencione las características del auxiliar docente que ayudaron en su aprendizaje": "Mencione las características del auxiliar docente que ayudaron en su aprendizaje",
		};

		let courseTitle = $kollaResponseText.find(".formulario-titulo").text(); // E.g.: 'Simulación (082041) - Comisión: K4053', 'Administración Gerencial (082039) - Comisión: K5054'
		let groups = /^(.*) \((\d{6})\) - Comisión: ([\w\d]{5})$/.exec(courseTitle);
		if (!groups) throw new Error(`Survey courseTitle couldn't be parsed: ${courseTitle}`);
		// let courseName = groups[1]; // E.g. Simulación
		let courseCode = groups[2]; // E.g. 082041
		let classCode = groups[3]; // E.g. K4053

		return $kollaResponseText.find(".encuesta").toArray().map(surveyDiv => {
			let $surveyDiv = $(surveyDiv);

			let surveyTitle = $surveyDiv.find(".encuesta-titulo");
			if (surveyTitle.length !== 1) throw new Error(`Do not know how to handle ${surveyTitle.length} survey title elements. htmlForLog: ${htmlForLog}`);  // TODO delete this check?
			surveyTitle = surveyTitle.text().trim();

			groups = surveyTitleRegex.exec(surveyTitle);
			if (!groups) throw new Error(`surveyTitle couldn't be parsed: ${surveyTitle}`);

			let surveyKind = surveyKindsMapping[groups[1]]; // DOCENTE, AUXILIAR
			let quarter = quarterMapping[groups[2]]; // A, 1C, 2C
			let year = parseInt(groups[3]); // 2018, 2019, ...

			let professor = $surveyDiv.find(".encuesta-elemento h3");
			if (professor.length !== 1) throw new Error(`Do not know how to handle ${professor.length} professor elements. htmlForLog: ${htmlForLog}`); // TODO delete this check?
			professor = professor.text().trim();

			groups = professorRegex.exec(professor);
			if (!groups) throw new Error(`professor couldn't be parsed: ${professor}`);

			let professorName = groups[1].toUpperCase();
			let professorRole = professorRolesMapping[groups[2]]; // TITULAR, ASOCIADO, ADJUNTO, etc.

			let answers = $surveyDiv.find(".panel-info .panel-body .form-group").toArray()
				.map(item => {
					let $item = $(item);
					let $questionLabel = $item.find("> label");

					let question = $questionLabel.text().replace("*", "").trim(); // TODO replace this with a backend enum.
					question = questionsMapping[question] || question;

					let answer = {
						question: question,
					};

					let labelFor = $questionLabel.attr("for");
					let $answerElement = $item.find(`[name=${labelFor}]`);
					if ($answerElement.is("textarea")) {
						answer.type = "TEXT";
						answer.value = $answerElement.val() || null;
					} else if ($answerElement.is("input")) {
						answer.type = "PERCENTAGE";
						let value = parseInt($answerElement.filter(":checked").parent().text());
						answer.value = isNaN(value) ? null : value;
					} else {
						throw new Error(`Couldn't parse value for question ${question}. Item: ${$item.html()}`);
					}
					return answer;
				});

			return {
				surveyKind: surveyKind,
				year: year,
				quarter: quarter,
				classCode: classCode,
				courseCode: courseCode,
				professorName: professorName,
				professorRole: professorRole,

				surveyFields: answers, // Only used for posting surveys, not professor classes.
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
		parseKollaSurveyForm: parseKollaSurveyForm,
	};
};
