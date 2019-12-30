Array.prototype.removeIf = function (callback) {
	let i = 0;
	while (i < this.length) {
		if (callback(this[i], i)) {
			this.splice(i, 1);
		} else {
			++i;
		}
	}
};

Array.prototype.flatMap = function (lambda) {
	return Array.prototype.concat.apply([], this.map(lambda));
};


(function () {
	const PATH_NAME_HORARIOS = "/alu/horarios.do";
	const PATH_NAME_FINALES = "/alu/acfin.do";
	const PATH_NAME_LISTADO_MATERIAS = "/alu/mat.do";
	const PATH_NAME_PRE_INSCRIPCION = "/alu/preins.do";
	const PATH_NAME_PRE_INSCRIPCION_POP_UP = "/alu/preinscolas.do";

	let apiConnector = new ApiConnector();
	let pagesDataParser = new PagesDataParser(apiConnector);
	let utils = new Utils();
	let teachersCollector = new TeachersCollector(pagesDataParser, apiConnector);

	switch (location.pathname) {
		case PATH_NAME_HORARIOS:
			HorariosPage(utils);
			break;
		case PATH_NAME_FINALES:
			ActasDeFinalesPage(pagesDataParser, apiConnector, utils);
			break;
		case PATH_NAME_PRE_INSCRIPCION_POP_UP:
			PreInscripcionPopUpPage(utils);
			break;
		case PATH_NAME_PRE_INSCRIPCION:
			PreInscripcionPage(utils);
			break;
		case PATH_NAME_LISTADO_MATERIAS:
			ListadoMateriasPage(pagesDataParser);
			break;
		default:
	}

	teachersCollector.collectIfNeeded();

	$("body").on("click", ".powered-by-siga-helper", function () {
		window.open("https://chrome.google.com/webstore/detail/siga-helper/jdgdheoeghamkhfppapjchbojhehimpe", "_blank");
	});

})();
