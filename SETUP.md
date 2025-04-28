# CrackLeet Setup Guide

This document provides detailed instructions for setting up CrackLeet, both using pre-built releases and building from source.

## Using Pre-built Releases

### Requirements
- Windows, macOS, or Linux operating system
- Internet connection for Gemini API access
- Gemini API key ([Get one here](https://ai.google.dev/))

### Installation Steps

#### Windows
1. Download the latest Windows release (.exe or .zip) from the [Releases page](https://github.com/mohit-nagaraj/crackleet/releases)
2. If downloaded as ZIP, extract the contents to your preferred location
3. Run `CrackLeet.exe` to start the application
4. On first launch, go to settings page to setup the model & key


## Building from Source

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or later)
- [npm](https://www.npmjs.com/) (v7 or later)
- [Git](https://git-scm.com/)
- [Qt](https://www.qt.io/download) (v5.15+ recommended)
- C++ development environment:
  - Windows: Visual Studio or MinGW with g++
  - macOS: Xcode Command Line Tools
  - Linux: GCC or Clang
- [qmake](https://doc.qt.io/qt-5/qmake-manual.html)

### Build Steps

#### 1. Clone the Repository
```bash
git clone https://github.com/mohit-nagaraj/crackleet.git
cd crackleet
```

#### 2. Build the Qt Injector Component
Navigate to the Qt injector directory:
```bash
cd qt-injector
```

For Windows with MinGW:
```bash
qmake "LIBS += -ldwmapi -luser32"
mingw32-make clean
mingw32-make
windeployqt --dir release release\injector.exe
```

For macOS and Linux (adjust as needed):
```bash
qmake
make clean
make
```

#### 3. Copy Qt Injector to Electron App
After building the Qt component, copy the release folder to the electron-app directory:

Windows:
```bash
xcopy /E /I release ..\electron-app\injector
```

macOS/Linux:
```bash
mkdir -p ../electron-app/injector
cp -r release/* ../electron-app/injector/
```

#### 4. Build the Electron App
Navigate to the Electron app directory:
```bash
cd ../electron-app
```

Install dependencies:
```bash
npm install
```

Run the development version:
```bash
npm start
```

Build distributable packages:
```bash
npm run build
```

The built application will be in the `dist` folder.

## Troubleshooting

### Common Issues

#### Application Won't Launch
- Ensure all dependencies are installed
- Check logs for error messages
- Verify your Gemini API key is valid

#### Overlay Not Working
- Ensure the application has necessary screen capture permissions
- Check that no other overlay software is conflicting

#### Build Errors
- Ensure you have the correct version of Qt installed
- Check that your C++ compiler is properly configured
- Verify all paths are correct in your build environment

## Need Help?
If you encounter any issues not covered here, please [create an issue](https://github.com/mohit-nagaraj/crackleet/issues) on our GitHub repository.