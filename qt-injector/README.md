qmake "LIBS += -ldwmapi -luser32" 
mingw32-make clean
mingw32-make

for dlls:
windeployqt --dir release release\injector.exe

copy release from here to electron app