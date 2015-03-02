
// Show avgs: 
(function() {
    var PATH_NAME_FINALES = "/alu/acfin.do";
    
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

    if (location.pathname == PATH_NAME_FINALES) {
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

//-------------------------------

// Add info to the days in the popup.
(function() {
    var PATH_NAME_PRE_INSCRIPCION_POP_UP = "/alu/preinscolas.do";

    var getTimeInfoString = function(str) {
        var hours = {
            m: {
                0: {
                    start: "7:45",
                    end: "8:30"
                },
                1: {
                    start: "8:30",
                    end: "9:15"
                },
                2: {
                    start: "9:15",
                    end: "10:00"
                },
                3: {
                    start: "10:15",
                    end: "11:00"
                },
                4: {
                    start: "11:00",
                    end: "11:45"
                },
                5: {
                    start: "11:45",
                    end: "12:30"
                },
                6: {
                    start: "12:30",
                    end: "13:15"
                }
            },
            t: {
                0: {
                    start: "13:30",
                    end: "14:15"
                },
                1: {
                    start: "14:15",
                    end: "15:00"
                },
                2: {
                    start: "15:00",
                    end: "15:45"
                },
                3: {
                    start: "16:00",
                    end: "16:45"
                },
                4: {
                    start: "16:45",
                    end: "17:30"
                },
                5: {
                    start: "17:30",
                    end: "18:15"
                },
                6: {
                    start: "18:15",
                    end: "19:00"
                },
            },
            n: {
                0: {
                    start: "18:15",
                    end: "19:00"
                },
                1: {
                    start: "19:00",
                    end: "19:45"
                },
                2: {
                    start: "19:45",
                    end: "20:30"
                },
                3: {
                    start: "20:45",
                    end: "21:30"
                },
                4: {
                    start: "21:30",
                    end: "22:15"
                },
                5: {
                    start: "22:15",
                    end: "23:00"
                },
                6: {
                    start: "6", //Should never go through here.
                    end: "6"
                }
            }
        };
        var days = {
            Lu: "Lunes",
            Ma: "Martes",
            Mi: "Miercoles",
            Ju: "Jueves",
            Vi: "Viernes",
            Sa: "Sabado",
            "Sá": "Sabado"
        };
        var turns = {
            m: "Mañana",
            t: "Tarde",
            n: "Noche"
        };
        var getStringForDay = function(dayStr) {
            var day = dayStr.split("(")[0];
            var turn = dayStr.match(/\(([^)]+)\)/)[1];
            var firstHour = dayStr.split(")")[1].split(":")[0];
            var lastHour = dayStr.split(")")[1].split(":")[1];

            var finalStr = days[day] + " (" + turns[turn] + ") " + hours[turn][firstHour].start + "hs a " + hours[turn][lastHour].end + "hs";
            return finalStr;
        };

        var finalStr = "";
        $.each(str.split(" "), function() {
            finalStr += getStringForDay(this) + " y ";
        });
        return finalStr.substr(0, finalStr.length - 3);
    };

    var addTimeInfo = function($tr) {
        var $td = $tr.find("td:eq(2)");
        $td.html($td.text() + "<br /><b>" + getTimeInfoString($td.text()) + "</b>");
    };

    if (location.pathname == PATH_NAME_PRE_INSCRIPCION_POP_UP) {
        $(".std-canvas table tbody tr").each(function(){
            addTimeInfo($(this));
        });
    }
})();

