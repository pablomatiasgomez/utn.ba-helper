#!/bin/bash

./build.sh

echo "Starting packaging.."

minifyJs () {
  # npm package "minify" needs to be installed globally.
  # sudo npm i minify -g
  echo "Minifying $1"
  mv "$1" "$1.bk.js"
  minify "$1.bk.js" > "$1"
}
restoreJs () {
  echo "Restoring $1"
  rm "$1"
  mv "$1.bk.js" "$1"
}

rm out.zip

minifyJs "js/siga-helper.min.js"
minifyJs "js/guarani-helper.min.js"
minifyJs "js/background.js"

echo "Creating out.zip ..."
zip -vr out.zip css/ images/ js/siga-helper.min.js js/guarani-helper.min.js js/background.js js/pdf.worker.min.js manifest.json

restoreJs "js/siga-helper.min.js"
restoreJs "js/guarani-helper.min.js"
restoreJs "js/background.js"
