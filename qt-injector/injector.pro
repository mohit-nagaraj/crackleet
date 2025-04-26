QT += core
CONFIG += console
CONFIG -= app_bundle
TARGET = injector
SOURCES += main.cpp
QMAKE_LFLAGS += -static
CONFIG += static
LIBS += -ldwmapi -luser32