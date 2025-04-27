#include <QCoreApplication>
#include <windows.h>
#include <dwmapi.h>
#include <QDebug>

BOOL EnableDwmCloaking(HWND hwnd) {
    qDebug() << "Enabling DWM cloaking...";
    const DWORD DWMWA_CLOAK = 13;
    DWORD cloakValue = 1;
    BOOL result = DwmSetWindowAttribute(hwnd, DWMWA_CLOAK, &cloakValue, sizeof(cloakValue)) == S_OK;
    qDebug() << "DWM cloaking result:" << result;
    return result;
}

int main(int argc, char *argv[]) {
    QCoreApplication app(argc, argv);

    qDebug() << "Starting injector...";

    HWND hwnd = FindWindowW(NULL, L"Secure Window 123");
    if (!hwnd) {
        qDebug() << "Window not found!";
        return 1;
    }

    qDebug() << "Window found. Modifying styles...";
    LONG_PTR exStyle = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
    exStyle |= WS_EX_LAYERED | WS_EX_NOREDIRECTIONBITMAP;
    if (!SetWindowLongPtrW(hwnd, GWL_EXSTYLE, exStyle)) {
        qDebug() << "Failed to set window styles!";
    } else {
        qDebug() << "Window styles modified successfully.";
    }

    if (!SetLayeredWindowAttributes(hwnd, 0, 255, LWA_ALPHA)) {
        qDebug() << "Failed to set layered window attributes!";
    } else {
        qDebug() << "Layered window attributes set successfully.";
    }

    if (!EnableDwmCloaking(hwnd)) {
        qDebug() << "Failed to enable DWM cloaking!";
    } else {
        qDebug() << "DWM cloaking enabled successfully.";
    }

    return app.exec();
}