#!/bin/bash

rm -rf ./build

# Build the app JS
cd src
tsc
cd ..

# Build main app
v1=$(node buildversion.js)
v2=$(node buildversion.js 1)

npx electron-packager . Prisbeam --ignore sql/win --ignore sql/preprocessed.db --ignore updater --ignore intimate --ignore sql/preprocessed.db --ignore sql/preprocessed2.db --ignore e621 --overwrite --platform=darwin --arch=arm64 --icon=./logo/logo.icns --out=./build
npx electron-packager . Prisbeam --ignore sql/mac --ignore sql/preprocessed.db --ignore updater --ignore intimate --ignore sql/preprocessed.db --ignore sql/preprocessed2.db --ignore e621 --overwrite --platform=win32 --arch=x64 --icon=./logo/logo-round.ico --out=./build
/Library/Atomic/SDK/convert_darwin_arm64.sh ./build/Prisbeam-darwin-arm64/Prisbeam.app

cd ./build/Prisbeam-darwin-arm64 || exit
zip -r ../../build/Prisbeam-Mac-ARM64.zip ./Prisbeam.app
cd ../..
curl -v --header "PRIVATE-TOKEN: $(cat ~/.deploy.txt)" --header "Content-Type: multipart/form-data" --upload-file ./build/Prisbeam-Mac-ARM64.zip https://source.equestria.dev/api/v4/projects/168/packages/generic/prisbeam/$v1/Prisbeam-Mac-ARM64.zip

cd ./build/Prisbeam-win32-x64 || exit
zip -r ../../build/Prisbeam-Win32-x64.zip ./*
cd ../..
curl -v --header "PRIVATE-TOKEN: $(cat ~/.deploy.txt)" --header "Content-Type: multipart/form-data" --upload-file ./build/Prisbeam-Win32-x64.zip https://source.equestria.dev/api/v4/projects/168/packages/generic/prisbeam/$v1/Prisbeam-Win32-x64.zip

# Build updater
npx electron-packager ./updater "Prisbeam Updater" --ignore sql/win --ignore sql/preprocessed.db --ignore sql/preprocessed2.db --overwrite --platform=darwin --arch=arm64 --icon=./logo/logo-updater.icns --out=./build
npx electron-packager ./updater "Prisbeam Updater" --ignore sql/mac --ignore sql/preprocessed.db --ignore sql/preprocessed2.db --overwrite --platform=win32 --arch=x64 --icon=./logo/logo-updater-round.ico --out=./build
/Library/Atomic/SDK/convert_darwin_arm64.sh ./build/Prisbeam\ Updater-darwin-arm64/Prisbeam\ Updater.app

cd ./build/Prisbeam\ Updater-darwin-arm64 || exit
zip -r ../../build/Prisbeam-Updater-Mac-ARM64.zip ./Prisbeam\ Updater.app
cd ../..
curl -v --header "PRIVATE-TOKEN: $(cat ~/.deploy.txt)" --header "Content-Type: multipart/form-data" --upload-file ./build/Prisbeam-Updater-Mac-ARM64.zip https://source.equestria.dev/api/v4/projects/168/packages/generic/prisbeam-updater/$v2/Prisbeam-Updater-Mac-ARM64.zip

cd ./build/Prisbeam\ Updater-win32-x64 || exit
zip -r ../../build/Prisbeam-Updater-Win32-x64.zip ./*
cd ../..
curl -v --header "PRIVATE-TOKEN: $(cat ~/.deploy.txt)" --header "Content-Type: multipart/form-data" --upload-file ./build/Prisbeam-Updater-Win32-x64.zip https://source.equestria.dev/api/v4/projects/168/packages/generic/prisbeam-updater/$v2/Prisbeam-Updater-Win32-x64.zip

# Remove uploaded files
rm -rf ./build
rm -rf ./build
rm -rf ./build
