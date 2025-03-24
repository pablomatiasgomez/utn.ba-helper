#!/bin/bash
set -e

echo "Starting packaging.."

if ! which uglifyjs &> /dev/null ; then
  echo '[ERROR] uglifyjs not found. Install it with "npm install uglify-js -g"'
  exit 1
fi

uglifyJsFile () {
  echo "Uglifying $1"
  mv "$1" "$1.bk.js"
  uglifyjs "$1.bk.js" --compress --mangle --output "$1" --source-map includeSources
}
restoreJsFile () {
  echo "Restoring $1"
  rm "$1"
  mv "$1.bk.js" "$1"
}

rm package.zip || true

uglifyJsFile "js/guarani-helper.min.js"
uglifyJsFile "js/guarani-kolla-helper.min.js"
uglifyJsFile "js/background.js"
uglifyJsFile "js/guarani/foreground.js"

echo "Creating package.zip ..."
zip -vr package.zip \
css/ \
images/ \
js/guarani-helper.min.js \
js/guarani-kolla-helper.min.js \
js/background.js \
js/guarani/foreground.js \
js/lib/libs.min.js \
manifest.json
echo "Created package.zip ..."

restoreJsFile "js/guarani-helper.min.js"
restoreJsFile "js/guarani-kolla-helper.min.js"
restoreJsFile "js/background.js"
restoreJsFile "js/guarani/foreground.js"
