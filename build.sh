#!/bin/bash

echo "Building app.."

JS_FILES="\
js/jquery-3.4.1.min.js \
js/Errors.js \
js/Utils.js \
js/ApiConnector.js \
js/DataCollector.js \
js/PagesDataParser.js \
js/pages/HorariosPage.js \
js/pages/ActasDeFinalesPage.js \
js/pages/PreInscripcionPopUpPage.js \
js/pages/PreInscripcionPage.js \
js/pages/EncuestaDocentePopUpPage.js \
js/custompages/ProfessorsSearchCustomPage.js \
js/custompages/CoursesSearchCustomPage.js \
js/custompages/PlanTrackingCustomPage.js \
js/custompages/CustomPages.js \
js/functions.js"
cat $JS_FILES > js/siga-helper.min.js

echo "Build finished."
