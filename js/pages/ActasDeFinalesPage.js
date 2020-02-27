let ActasDeFinalesPage = function (pagesDataParser, dataCollector, utils) {

	let passingGrades = [];
	let failingGrades = [];

	let pesoAcademico;
	let passingGradesAverage; // Only passing grades are considered here
	let allGradesAverage; // Includes the failing grades.

	let $helperTable = $("<div style='display:inline-block;'><table><tbody></tbody></table></div>");

	let $passingGradesTable = $(".std-canvas table:first");
	let $failingGradesTable = $(".std-canvas table").length > 1 ? $(".std-canvas table:last") : $();

	let processGradeRow = function ($tr, gradesArray) {
		let date = utils.parseDate($tr.find("td:first").text());
		let grade = parseInt($tr.find("td:eq(5)").text());
		if (isNaN(grade)) return;

		let weightedGrade = utils.getWeightedGrade(date, grade);
		if (grade !== weightedGrade) {
			$tr.find("td:eq(6)").text(weightedGrade);
		}
		gradesArray.push(weightedGrade);
	};

	let getAvgFromArray = function (arr) {
		if (!arr.length) return null;
		let sum = arr.reduce((a, b) => a + b);
		return Math.round(sum / arr.length * 100) / 100;
	};

	let calculateAndAppendAverages = function () {
		$passingGradesTable.find("tbody tr").each((i, tr) => processGradeRow($(tr), passingGrades));
		$failingGradesTable.find("tbody tr").each((i, tr) => processGradeRow($(tr), failingGrades));

		allGradesAverage = getAvgFromArray(passingGrades.concat(failingGrades));
		passingGradesAverage = getAvgFromArray(passingGrades);

		let appendTableRow = (description, value) => $helperTable.find("tbody").append("<tr><td>" + description + "</td><td><b>" + (value !== null ? value : "n/a") + "</b></td></tr>");

		appendTableRow("Cantidad de materias aprobadas", passingGrades.length);
		appendTableRow("Cantidad de materias desaprobadas", failingGrades.length);
		appendTableRow("Promedio con desaprobados", allGradesAverage);
		appendTableRow("Promedio sin desaprobados", passingGradesAverage);
	};
	// ..

	// .. Peso academico
	let setPesoAcademico = function (startYear) {
		let yearsCount = (new Date().getFullYear() - startYear + 1);
		pesoAcademico = 11 * passingGrades.length - 5 * yearsCount - 3 * failingGrades.length;

		$helperTable.find(".peso-academico").remove();
		$helperTable.find("tbody").prepend("<tr class='peso-academico'><td>Peso academico</td><td> <b>" + pesoAcademico + "</b> <small>(11*" + passingGrades.length + " - 5*" + yearsCount + " - 3*" + failingGrades.length + ")</small></td></tr>");
	};

	// ..
	let logUserStat = function () {
		return dataCollector.logUserStat(pesoAcademico, passingGradesAverage, allGradesAverage, passingGrades.length, failingGrades.length);
	};

	let appendTable = function () {
		$(".std-canvas p:first").after($helperTable);
	};

	let addWeightedGradeColumn = function () {
		let $bothTables = $passingGradesTable.add($failingGradesTable);
		$bothTables.find("tr:not(:first)").append("<td></td>");
		$bothTables.find("tr:first").append("<th>Nota ponderada *</th>");
	};

	let getStartYear = function () {
		return pagesDataParser.getStartYear().then(startYear => {
			if (!startYear) {
				startYear = $(".std-canvas table tr").toArray()
					.map(elem => $(elem).find("td:first").text().split("/")[2])
					.sort()
					[0] || "2012"; // Last fall back...
			}
			return startYear;
		});
	};

	let addPoweredBy = function () {
		$(".std-canvas table").parent().css("display", "inline-block").append("<span class='powered-by-siga-helper'></span>");
	};

	let addWeightedGradeExplanation = function () {
		$(".std-canvas").append("<div>* La nota ponderada es calculada por el siga helper segun Ordenanza Nº 1549</div>");
	};

	// Init
	return Promise.resolve().then(() => {
		appendTable();
		addWeightedGradeColumn();
		calculateAndAppendAverages();
		addPoweredBy();
		addWeightedGradeExplanation();

		return getStartYear();
	}).then(startYear => {
		return setPesoAcademico(startYear);
	}).then(() => {
		return logUserStat();
	});
};
