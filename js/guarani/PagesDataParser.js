let PagesDataParser = function (utils) {

	// We want to fetch only once each page.
	let CACHED_PAGE_CONTENTS = {};

	/**
	 * Fetches and parses the way guarani's page ajax contents are loaded.
	 * Returned contents are different script tags that contain the html so they need to be parsed.
	 */
	let fetchAjaxPageContents = function (url, infoId) {
		if (CACHED_PAGE_CONTENTS[url]) {
			return Promise.resolve(CACHED_PAGE_CONTENTS[url]);
		}
		return $.ajax(url).then(responseText => {
			let response = JSON.parse(responseText);
			if (response.cod !== "1") throw new Error(`Invalid ajax contents for url ${url}. responseText: ${responseText}`);
			let contents = $(response.cont).filter("script").toArray()
				.map(script => $(script).html())
				.filter(script => script.startsWith("kernel.renderer.on_arrival"))
				.map(script => JSON.parse(script.replace("kernel.renderer.on_arrival(", "").replace(");", "")))
				.filter(data => data.info.id === infoId)
				.map(data => data.content);
			if (contents.length !== 1) throw new Error(`Found unexpected number of page contents: ${contents.length} for url ${url}. responseText: ${responseText}`);
			return contents[0];
		}).then(contents => {
			CACHED_PAGE_CONTENTS[url] = contents;
			return contents;
		});
	};

	/**
	 * Fetches a url that returns a pdf and parses the content into an array of strings.
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
		});
	};

	/**
	 * Tries to resolve and return the student id for the current logged in user.
	 * @returns {Promise<String>}
	 */
	let getStudentId = function () {
		return fetchPdfContents("/autogestion/grado/plan_estudio/generar_pdf").then(contents => {
			let index = contents.indexOf("Legajo:");
			if (index === -1) throw new Error(`Couldn't find studentId in pdfContents: ${JSON.stringify(contents)}`);

			let studentId = contents[index + 1].trim();
			// Split the checkdigit, add the thousands separator, and join the checkdigit again..
			// This is because we have been parsing studentIds in the form of "xxx.xxx-x"
			return parseInt(studentId.slice(0, -1)).toLocaleString("es-AR") + "-" + studentId.slice(-1);
		});
	};

	/**
	 * Fetches, from the register pdf, the current classes that the student is having.
	 * Used for different puprposes:
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
			// For example, it could be shown as  "123.456-" instead of "12.345-6"
			// If we need to use its value, we need to sanitize to the correct format.
			let studentIdAndName = contents[i++];
			let groups = /^(\d{2,3}\.\d{3}-\d?) (.*)$/.exec(studentIdAndName);
			if (!groups) throw new Error(`Couldn't parse studentIdAndName: ${studentIdAndName}. PdfContents: ${JSON.stringify(contents)}`);

			validateExpectedContents(["Código", "Actividad", "Período", "Comisión", "Ubicación", "Aula", "Horario"]);

			let classSchedules = [];
			const yearAndQuarterRegex = /^((1|2)(?:er|do) Cuat|Anual) (\d{4})$/;
			// After all the class schedules rows, this is the following text so we know where to stop..
			while (contents[i] !== "Firma y Sello Departamento") {
				let courseCode = contents[i++]; // e.g.: 950701
				if (!/^\d{6}$/.test(courseCode)) throw new Error(`courseCode couldn't be parsed: ${courseCode}. PdfContents: ${JSON.stringify(contents)}`);

				let courseName = contents[i++]; // e.g.: Fisica I

				let yearAndQuarter = contents[i++]; // e.g.: 1er Cuat 2021
				groups = yearAndQuarterRegex.exec(yearAndQuarter);
				if (!groups) {
					// Sometimes it can happen that the courseName was long enough that was split into two rows..
					courseName = `${courseName} ${yearAndQuarter}`;
					yearAndQuarter = contents[i++];
					groups = yearAndQuarterRegex.exec(yearAndQuarter);
				}
				if (!groups) throw new Error(`Class time couldn't be parsed: ${yearAndQuarter}. PdfContents: ${JSON.stringify(contents)}`);
				let quarter = (groups[1] === "Anual") ? "A" : (groups[2] + "C"); // A, 1C, 2C
				let year = parseInt(groups[3]);

				let classCode = contents[i++].toUpperCase(); // e.g.: Z1154

				let branch = contents[i++].toUpperCase()
					.replace(" ", "_")
					.replace("CAMPUS_VIRTUAL", "AULA_VIRTUAL"); // e.g.: CAMPUS, MEDRANO, AULA_VIRTUAL, ESCUELA
				if (branch === "ESCUELA") {
					// For some reason, this comes as two separate elements, like: ["Escuela", "Técnica -"]
					validateExpectedContents(["Técnica -"]);
					branch = "PIÑERO";
				}
				if (branch === "SIN_DESIGNAR") branch = null;

				i++; // (ClassRoomnumber) e.g.: "Sin definir", "2"

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
		return fetchAjaxPageContents("/autogestion/grado/plan_estudio", "info_plan").then(responseText => {
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
		let escapeRegExp = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

		const courseTypes = ["En curso", "Regularidad", "Equivalencia Parcial"];
		const finalExamTypes = ["Promoción", "Examen", "Equivalencia Total"];
		const allTypes = courseTypes.concat(finalExamTypes);

		const discardedGrades = [
			"Inicio de dictado",
			"Ausente",
			"No aprobad (No aprobada) Ausente",
		];
		const gradesRegex = [
			/(\d{1,2}) \(\w+\) (?:Promocionado|Aprobado|Reprobado)/,
			/Aprobada \(Aprobada\) Aprobado/,
			/No aprobad \(No aprobada\) Reprobado/,
			/Aprobado/,
			/Reprobado/,
			...discardedGrades.map(grade => new RegExp(escapeRegExp(grade))),
		];
		const dateRegex = /\d{2}\/\d{2}\/\d{4}/;
		const historyRowRegex = new RegExp(`^(${allTypes.map(escapeRegExp).join("|")}) {1,2}- (${gradesRegex.map(i => i.source).join("|")}) (${dateRegex.source}) - .*Detalle$`);

		return fetchAjaxPageContents("/autogestion/grado/historia_academica/?checks=PromocionA,RegularidadA,RegularidadR,RegularidadU,EnCurso,ExamenA,ExamenR,ExamenU,EquivalenciaA,EquivalenciaR,AprobResA,CreditosA,&modo=anio&param_modo=&e_cu=A&e_ex=A&e_re=A", "info_historia").then(responseText => {
			let courses = [];
			let finalExams = [];
			$(responseText).find(".catedra_nombre").toArray()
				.map(item => {
					let courseText = $(item).find("h4").text();
					let groups = /\((\d{6})\)/.exec(courseText);
					if (!groups) throw new Error(`courseText couldn't be parsed: ${courseText}`);
					let courseCode = groups[1];

					let historyRow = $(item).find("span").text().trim();
					groups = historyRowRegex.exec(historyRow);
					if (!groups) throw new Error(`historyRow couldn't be parsed: ${historyRow}`);
					let arr = courseTypes.includes(groups[1]) ? courses : finalExams;
					let gradeText = groups[2];

					// Do not care about these type of grades so we ignore the entire row.
					if (discardedGrades.includes(gradeText)) return;

					let isPassed = (gradeText.includes("Promocionado") || gradeText.includes("Aprobado")) && !gradeText.includes("No aprobad");
					let date = utils.parseDate(groups[4]);

					let grade = parseInt(groups[3]) || null;
					let weightedGrade = grade !== null ? utils.getWeightedGrade(date, grade) : null;

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
	 * Fetches all the current surveys that the user has to take o has taken.
	 * For each of them resolves the current professor name, class, course, quarter, etc.
	 * @returns {Promise<*[]>} an array of class schedules for each combination of professor and class
	 */
	let getProfessorClassesFromSurveys = function () {
		return fetchAjaxPageContents("/autogestion/grado/inicio_alumno", "lista_encuestas_pendientes").then(responseText => {
			if ($(responseText).find(".alert").text() === "No hay encuestas pendientes para completar") {
				return [];
			}
			throw new Error(`Unexpected html for getProfessorClassesFromSurveys: ${responseText}`);
		});
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
		getStudentId: getStudentId,
		getClassSchedules: getClassSchedules,

		getStudentPlanCode: getStudentPlanCode,
		getCoursesHistory: getCoursesHistory,

		getProfessorClassesFromSurveys: getProfessorClassesFromSurveys,
		getTakenSurveys: getTakenSurveys,
	};
};
