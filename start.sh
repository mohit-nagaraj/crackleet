#!/bin/bash

# Start Electron App
cd electron-app
npm start &

# Wait for window to appear
sleep 3

# Start Qt Injector
cd ../qt-injector
./injector

echo "Both apps running!"