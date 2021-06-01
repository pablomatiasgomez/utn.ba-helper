#!/bin/bash

echo "Building app.."

BASE_JS_FILES="\
js/jquery-3.4.1.min.js \
js/ApiConnector.js"

JS_FILES="\
js/siga/Errors.js \
js/siga/Utils.js \
js/siga/DataCollector.js \
js/siga/PagesDataParser.js \
js/siga/pages/HorariosPage.js \
js/siga/pages/ActasDeFinalesPage.js \
js/siga/pages/PreInscripcionPopUpPage.js \
js/siga/pages/PreInscripcionPage.js \
js/siga/pages/EncuestaDocentePopUpPage.js \
js/siga/custompages/ProfessorsSearchCustomPage.js \
js/siga/custompages/CoursesSearchCustomPage.js \
js/siga/custompages/PlanTrackingCustomPage.js \
js/siga/custompages/CustomPages.js \
js/siga/main.js"
cat $BASE_JS_FILES $JS_FILES > js/siga-helper.min.js

JS_FILES="\
js/pdf.min.js \
js/guarani/Utils.js \
js/guarani/DataCollector.js \
js/guarani/PagesDataParser.js \
js/guarani/custompages/ProfessorsSearchCustomPage.js \
js/guarani/custompages/CoursesSearchCustomPage.js \
js/guarani/custompages/PlanTrackingCustomPage.js \
js/guarani/custompages/CustomPages.js \
js/guarani/main.js"
cat $BASE_JS_FILES $JS_FILES > js/guarani-helper.min.js

echo "Build finished."
