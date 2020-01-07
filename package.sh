./build.sh

rm out.zip
mv js/siga-helper.min.js js/siga-helper.min.js.bk
minify js/siga-helper.min.js.bk --out-file js/siga-helper.min.js --builtIns false
zip -vr out.zip css/ images/ js/siga-helper.min.js js/background.js manifest.json
rm js/siga-helper.min.js
mv js/siga-helper.min.js.bk js/siga-helper.min.js
