#!/bin/bash

set -eo pipefail

echo "Deleting old build..."
rm -rf ../lambda-src/dist/

echo "Transpiling Typescript..."
( cd ../lambda-src && tsc )
#tsc --project ../../lambda-src/tsconfig-build.json

echo "Downloading dependencies..."
# We build a minimal set of dependencies so
# TODO extract this from the real package.json
cat <<EOF > ../lambda-src/dist/package.json
{
  "dependencies": {
    "axios": "^1.4.0",
    "util": "^0.12.5"
  }
}
EOF
# () means execute in subshell, so this one doesn't change directory
( cd ../lambda-src/dist && npm install )

echo "Building lambda.zip..."
rm -f ../lambda-src/dist/lambda.zip
node ./build.js
