rm out.zip
# mv js js.bk
# minify js.bk/ --out-dir js/ --mangle.keepClassName --builtIns false
zip -vr out.zip css/ images/ js/ manifest.json
# rm -r js
# mv js.bk js
