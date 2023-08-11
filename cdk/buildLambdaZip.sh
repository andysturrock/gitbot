#!/bin/bash

set -eo pipefail

# This script builds a zip file with all the lambda source code in it.
# TODO Build a separate zip for each lambda, rather than add all the code to each lambda.

echo "Deleting old build..."
rm -rf ../lambda-src/dist/

echo "Transpiling Typescript..."
( cd ../lambda-src && tsc --project tsconfig-build.json )

echo "Adding Ohm generated JS files to dist..."
cp ../lambda-src/ts-src/gitbotGrammar.ohm-bundle.js ../lambda-src/dist

echo "Downloading dependencies..."
# We build a minimal set of dependencies so
# TODO extract this from the real package.json
cat <<EOF > ../lambda-src/dist/package.json
{
  "dependencies": {
    "axios": "^1.4.0",
    "util": "^0.12.5",
    "@slack/bolt": "^3.13.3",
    "ohm-js": "^17.1.0"
  }
}
EOF
# () means execute in subshell, so this one doesn't change directory
( cd ../lambda-src/dist && npm install )

echo "Building lambda.zip..."
rm -f ../lambda-src/dist/lambda.zip
node ./build.js
