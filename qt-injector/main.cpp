#include <QCoreApplication>
#include <windows.h>
#include <dwmapi.h>
#include <QDebug>

BOOL EnableDwmCloaking(HWND hwnd) {
    const DWORD DWMWA_CLOAK = 13; // Cloaking attribute
    DWORD cloakValue = 1; // Enable cloaking
    return DwmSetWindowAttribute(hwnd, DWMWA_CLOAK, &cloakValue, sizeof(cloakValue)) == S_OK;
}

int main(int argc, char *argv[]) {
    QCoreApplication app(argc, argv);

    // Find Electron window by title
    HWND hwnd = FindWindowW(NULL, L"Secure Window 123");
    if (!hwnd) {
        qDebug() << "Window not found!";
        return 1;
    }

    // Modify window styles
    LONG_PTR exStyle = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
    exStyle |= WS_EX_LAYERED | WS_EX_NOREDIRECTIONBITMAP;
    if (!SetWindowLongPtrW(hwnd, GWL_EXSTYLE, exStyle)) {
        qDebug() << "Failed to set window styles!";
    }

    // Set window opacity
    if (!SetLayeredWindowAttributes(hwnd, 0, 255, LWA_ALPHA)) {
        qDebug() << "Failed to set layered window attributes!";
    }

    // Enable DWM cloaking
    if (!EnableDwmCloaking(hwnd)) {
        qDebug() << "Failed to enable DWM cloaking!";
    }

    return app.exec();
}