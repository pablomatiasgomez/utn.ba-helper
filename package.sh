#!/bin/bash

./build.sh

echo "Starting packaging.."

minifyJs () {
  # npm package "babel-minify" needs to be installed globally.
  echo "Minifying $1"
  mv "$1" "$1.bk"
  minify "$1.bk" --out-file "$1" --builtIns false
}
restoreJs () {
  echo "Restoring $1"
  rm "$1"
  mv "$1.bk" "$1"
}

rm out.zip

minifyJs "js/siga-helper.min.js"
minifyJs "js/background.js"

echo "Creating out.zip ..."
zip -vr out.zip css/ images/ js/siga-helper.min.js js/background.js manifest.json

restoreJs "js/siga-helper.min.js"
restoreJs "js/background.js"
