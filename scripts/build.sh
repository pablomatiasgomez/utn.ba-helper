#!/bin/bash
set -e

echo "Building app.."

JS_FILES="\
js/lib/jquery-3.6.0.min.js \
js/lib/xlsx.full.min.js \
js/lib/pdf.min.js"
cat $JS_FILES > js/lib/libs.min.js


JS_FILES="\
js/ApiConnector.js \
js/guarani/Errors.js \
js/guarani/Utils.js \
js/guarani/Store.js \
js/guarani/DataCollector.js \
js/guarani/PagesDataParser.js \
js/guarani/pages/EncuestasPendientesPage.js \
js/guarani/pages/HorariosPage.js \
js/guarani/pages/PreInscripcionPage.js \
js/guarani/custompages/ProfessorsSearchCustomPage.js \
js/guarani/custompages/CoursesSearchCustomPage.js \
js/guarani/custompages/PlanTrackingCustomPage.js \
js/guarani/custompages/CustomPages.js \
js/guarani/main.js"
cat $JS_FILES > js/guarani-helper.min.js

JS_FILES="\
js/ApiConnector.js \
js/guarani/Errors.js \
js/guarani/Utils.js \
js/guarani/Store.js \
js/guarani/PagesDataParser.js \
js/guarani/main-kolla.js"
cat $JS_FILES > js/guarani-kolla-helper.min.js

echo "Build finished."
