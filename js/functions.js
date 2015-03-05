(function() {
	var PATH_NAME_FINALES = "/alu/acfin.do";
	var PATH_NAME_PRE_INSCRIPCION = "/alu/preins.do";
	var PATH_NAME_PRE_INSCRIPCION_POP_UP = "/alu/preinscolas.do";

	var utils = new Utils();

	switch (location.pathname) {
		case PATH_NAME_FINALES:
			ActasDeFinalesPage(utils);
			break;
		case PATH_NAME_PRE_INSCRIPCION_POP_UP:
			PreInscripcionPopUpPage(utils);
			break;
		case PATH_NAME_PRE_INSCRIPCION:
			PreInscripcionPage(utils);
			break;
		default:
	}
})();