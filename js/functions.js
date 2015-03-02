(function() {
    var PATH_NAME = "/alu/acfin.do";


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
        return sum / arr.length;
    };

    if (location.pathname == PATH_NAME) {
        var aprobados = [];
        var desaprobados = [];

        $(".std-canvas table:first tbody tr").each(function() {
            addNoteToArray($(this), aprobados);
        });

        $(".std-canvas table:last tbody tr").each(function() {
            addNoteToArray($(this), desaprobados);
        });

        $(".std-canvas p:first").after("<p>Promedio con desaprobados: " + getAvgFromArray(aprobados.concat(desaprobados)).toString().substr(0, 4) + "</p>");
        $(".std-canvas p:first").after("<p>Promedio sin desaprobados: " + getAvgFromArray(aprobados).toString().substr(0, 4) + "</p>");

    }
})();