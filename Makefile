.ONESHELL:
.PHONY: build package

build:
	scripts/build.sh

package: build
	scripts/package.sh
