del /s /q build

cd src || exit
npx tsc
cd .. || exit

npx electron-packager . Faunerie --ignore sql/win --ignore sql/preprocessed.db --ignore updater --ignore intimate --ignore sql/preprocessed.db --ignore sql/preprocessed2.db --ignore e621 --overwrite --platform=darwin --arch=arm64 --icon=./logo/logo.icns --out=./build
npx electron-packager . Faunerie --ignore sql/mac --ignore sql/preprocessed.db --ignore updater --ignore intimate --ignore sql/preprocessed.db --ignore sql/preprocessed2.db --ignore e621 --overwrite --platform=win32 --arch=x64 --icon=./logo/logo-round.ico --out=./build

npx electron-packager ./updater "Faunerie Updater" --ignore sql/win --ignore sql/preprocessed.db --ignore sql/preprocessed2.db --overwrite --platform=darwin --arch=arm64 --icon=./logo/logo-updater.icns --out=./build
npx electron-packager ./updater "Faunerie Updater" --ignore sql/mac --ignore sql/preprocessed.db --ignore sql/preprocessed2.db --overwrite --platform=win32 --arch=x64 --icon=./logo/logo-updater-round.ico --out=./build
