#!/bin/bash
set -e

echo "Starting packaging.."

if ! which minify &> /dev/null ; then
  echo '[ERROR] minify not found. Install it with "npm i minify -g"'
  exit 1
fi

minifyJs () {
  echo "Minifying $1"
  mv "$1" "$1.bk.js"
  minify "$1.bk.js" > "$1"
}
restoreJs () {
  echo "Restoring $1"
  rm "$1"
  mv "$1.bk.js" "$1"
}

rm package.zip || true

minifyJs "js/guarani-helper.min.js"
minifyJs "js/guarani-kolla-helper.min.js"
minifyJs "js/background.js"
minifyJs "js/guarani/foreground.js"

echo "Creating package.zip ..."
zip -vr package.zip css/ images/ js/guarani-helper.min.js js/guarani-kolla-helper.min.js js/background.js js/guarani/foreground.js js/lib/pdf.worker.min.js manifest.json
echo "Created package.zip ..."

restoreJs "js/guarani-helper.min.js"
restoreJs "js/guarani-kolla-helper.min.js"
restoreJs "js/background.js"
restoreJs "js/guarani/foreground.js"
