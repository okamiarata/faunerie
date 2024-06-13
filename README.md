# Prisbeam
A browser and search engine for local copies of various image boards (Derpibooru, Furbooru, e621, ...)

## Development
Assuming you are using macOS or Linux. Other POSIX systems won't work as Electron does not have binaries for these.

### Cloning
```
git clone https://source.equestria.dev/equestria.dev/prisbeam
```

### Setup
```
# Note: this will install TypeScript globally
npm install
```

### Running
```
# For the app itself:
npm run debug

# For the updater:
npm run debug-updater
```

### Building
```
# This will run 'npm audit fix' and 'npm install' to update dependencies if needed
npm run release
```
