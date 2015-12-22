var ActasDeFinalesPage = function(utils) {
	
	var KEY_ENTER = 13;
	
	var aprobados = [];
	var desaprobados = [];

	var pesoAcademico;
	var avgAprobados;
	var avgDesaprobados;

	// .. avgs
	var addNoteToArray = function($tr, arr) {
		var note = $tr.find("td:last").text();

		if (note && !isNaN(note)) {
			arr.push(parseInt(note));
		}
	};

	var getAvgFromArray = function(arr) {
		var sum = arr.reduce(function(a, b) {
			return a + b;
		});
		return Math.round(sum / arr.length * 100) / 100;
	};

	var setAvgs = function() {
		$(".std-canvas table:first tbody tr").each(function() {
			addNoteToArray($(this), aprobados);
		});

		if ($(".std-canvas table").length > 1) {
			$(".std-canvas table:last tbody tr").each(function() {
				addNoteToArray($(this), desaprobados);
			});
		}

		avgDesaprobados = getAvgFromArray(aprobados.concat(desaprobados));
		avgAprobados = getAvgFromArray(aprobados);

		$(".std-canvas p:first").after("<p>Promedio con desaprobados: <b>" + avgDesaprobados + "</b></p>");
		$(".std-canvas p:first").after("<p>Promedio sin desaprobados: <b>" + avgAprobados + "</b></p>");
	};
	// ..

	// .. Peso academico
	var setPesoAcademico = function(startYear) {
		var yearsCount = (new Date().getFullYear() - startYear + 1);
		pesoAcademico = 11 * aprobados.length - 5 * yearsCount - 3 * desaprobados.length;

		$(".std-canvas p.peso-academico").remove();
		$(".std-canvas p:first").after("<p class='peso-academico'>Peso academico: <b>" + pesoAcademico + "</b> <small>(11*" + aprobados.length + " - 5*" + yearsCount + " - 3*" + desaprobados.length + ")</small> <a class='helper change-year'>Cambiar año de ingreso</a><input class='year-change' type='text' value='" + startYear + "'/></p>");
		bindChangeYear();
	};


	var bindChangeYear = function() {
		$(".std-canvas .change-year").on("click", function() {
			$(this).hide();
			$(this).parent().find(".year-change").show();
		});

		$(".std-canvas .year-change").on("keydown", function(e) {
			if (e.keyCode === KEY_ENTER) {
				var value = $(this).val();
				if (!isNaN(value)) {
					utils.setStartYear(value);
					setPesoAcademico(value);
				}
				e.preventDefault();
				return false;
			}
		});
	};
	// ..

	var postData = function() {
		var timer = setInterval(function() {
			if (avgAprobados && avgDesaprobados && pesoAcademico) {
				clearInterval(timer);
				utils.postData(avgAprobados, avgDesaprobados, pesoAcademico);
			}
		}, 1000);
	};

	// Init
	(function() {
		setAvgs();
		utils.getStartYear(setPesoAcademico);

		postData();
	})();
	

	// Public
	return {};
};