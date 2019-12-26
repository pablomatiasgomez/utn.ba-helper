var ActasDeFinalesPage = function(pagesDataParser, apiConnector, utils) {
	
	let passingGrades = [];
	let failingGrades = [];

	let pesoAcademico;
	let passingGradesAverage;
	let allGradesAverage;

	let $helperTable = $("<div style='display:inline-block;'><table><tbody></tbody></table></div>");

	let $passingGradesTable = $(".std-canvas table:first");
	let $failingGradesTable = $(".std-canvas table").length > 1 ? $(".std-canvas table:last") : $();

	// .. avgs
	var processNoteRow = function($tr, arr) {
		let date = utils.parseDate($tr.find("td:first").text());
		let grade = parseInt($tr.find("td:eq(5)").text());
		if (isNaN(grade)) return;

		let weightedGrade = utils.getWeightedGrade(date, grade);
		if (grade !== weightedGrade) {
			$tr.find("td:eq(6)").text(weightedGrade);
		}
		arr.push(weightedGrade);
	};

	let getAvgFromArray = function (arr) {
		var sum = arr.reduce((a, b) => a + b);
		return Math.round(sum / arr.length * 100) / 100;
	};

	let setAvgs = function () {
		$passingGradesTable.find("tbody tr").each((i, tr) => processNoteRow($(tr), passingGrades));
		$failingGradesTable.find("tbody tr").each((i, tr) => processNoteRow($(tr), failingGrades));

		allGradesAverage = getAvgFromArray(passingGrades.concat(failingGrades));
		passingGradesAverage = getAvgFromArray(passingGrades);

		var appendTableRow = function (description, value) {
			$helperTable.find("tbody").append("<tr><td>" + description + "</td><td><b>" + value + "</b></td></tr>");
		};

		appendTableRow("Cantidad de materias aprobadas", passingGrades.length);
		appendTableRow("Cantidad de materias desaprobadas", failingGrades.length);
		appendTableRow("Promedio con desaprobados", allGradesAverage);
		appendTableRow("Promedio sin desaprobados", passingGradesAverage);
	};
	// ..

	// .. Peso academico
	var setPesoAcademico = function(startYear) {
		var yearsCount = (new Date().getFullYear() - startYear + 1);
		pesoAcademico = 11 * passingGrades.length - 5 * yearsCount - 3 * failingGrades.length;

		$helperTable.find(".peso-academico").remove();
		$helperTable.find("tbody").prepend("<tr class='peso-academico'><td>Peso academico</td><td> <b>" + pesoAcademico + "</b> <small>(11*" + passingGrades.length + " - 5*" + yearsCount + " - 3*" + failingGrades.length + ")</small></td></tr>");
		postData();
	};

	// ..

	var postData = function() {
		return pagesDataParser.getNumeroLegajo().then(legajo => {
			return apiConnector.logUserStats(legajo, passingGradesAverage, allGradesAverage, pesoAcademico);
		});
	};

	var appendTable = function() {
		$(".std-canvas p:first").after($helperTable);
	};

	var addPonderatedColumn = function() {
		var $bothTables = $passingGradesTable.add($failingGradesTable);
		$bothTables.find("tr:not(:first)").append("<td></td>");
		$bothTables.find("tr:first").append("<th>Nota ponderada *</th>");
	};

	var getStartYear = function() {
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

	var addPoweredBy = function() {
		$(".std-canvas table").parent().css("display", "inline-block").append("<span class='powered-by-siga-helper'></span>");
	};

	var addPonderatedNoteExplanation = function() {
		$(".std-canvas").append("<div>* La nota ponderada es calculada por el siga helper segun Ordenanza Nº 1549</div>");
	};

	// Init
	(function() {
		appendTable();
		addPonderatedColumn();
		setAvgs();
		getStartYear().then(startYear => setPesoAcademico(startYear));
		addPoweredBy();
		addPonderatedNoteExplanation();
	})();
	
	// Public
	return {};
};
