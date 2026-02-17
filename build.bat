rmdir /S /Q dist
rmdir /S /Q "%LOCALAPPDATA%\electron-builder\Cache\winCodeSign"
set CSC_IDENTITY_AUTO_DISCOVERY=false
npm run dist