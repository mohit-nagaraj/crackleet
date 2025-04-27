TEMPLATE = app
QT += core
CONFIG += console
CONFIG -= app_bundle

SOURCES += main.cpp

LIBS += -ldwmapi -luser32

RC_FILE = injector.rc