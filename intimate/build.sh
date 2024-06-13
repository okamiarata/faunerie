#npx electron-packager . Intimate --overwrite --platform=darwin --arch=arm64 --icon=./logo/logo-round.ico --out=./build
npx electron-packager . Intimate --overwrite --platform=darwin --arch=arm64 --out=./build
npx electron-packager . Intimate --overwrite --platform=win32 --arch=x64 --out=./build
/Library/Atomic/SDK/convert_darwin_arm64.sh ./build/Intimate-darwin-arm64/Intimate.app || /Volumes/Projects/atomic/converter/convert_darwin_arm64.sh ./build/Intimate-darwin-arm64/Intimate.app
/Library/Atomic/SDK/convert_windows_x64.sh ./build/Intimate-win32-x64 || /Volumes/Projects/atomic/converter/convert_windows_x64.sh ./build/Intimate-win32-x64
