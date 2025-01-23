#!/bin/bash
set -e

echo "Starting packaging.."

if ! which uglifyjs &> /dev/null ; then
  echo '[ERROR] uglifyjs not found. Install it with "npm i uglifyjs -g"'
  exit 1
fi

uglifyJs () {
  echo "Uglifying $1"
  mv "$1" "$1.bk.js"
  uglifyjs "$1.bk.js" --compress --mangle --output "$1"
}
restoreJs () {
  echo "Restoring $1"
  rm "$1"
  mv "$1.bk.js" "$1"
}

rm package.zip || true

uglifyJs "js/guarani-helper.min.js"
uglifyJs "js/guarani-kolla-helper.min.js"
uglifyJs "js/background.js"
uglifyJs "js/guarani/foreground.js"

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

restoreJs "js/guarani-helper.min.js"
restoreJs "js/guarani-kolla-helper.min.js"
restoreJs "js/background.js"
restoreJs "js/guarani/foreground.js"
