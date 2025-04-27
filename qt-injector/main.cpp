#include <QCoreApplication>
#include <windows.h>
#include <dwmapi.h>
#include <cstdio>

BOOL EnableDwmCloaking(HWND hwnd) {
    printf("Enabling DWM cloaking...\n");
    const DWORD DWMWA_CLOAK = 13;
    DWORD cloakValue = 1;
    HRESULT hr = DwmSetWindowAttribute(hwnd, DWMWA_CLOAK, &cloakValue, sizeof(cloakValue));
    if (hr != S_OK) {
        printf("DwmSetWindowAttribute failed! HRESULT: 0x%08lx\n", hr);
        return FALSE;
    }
    printf("DWM cloaking result: %d\n", hr == S_OK);
    return TRUE;
}

int main(int argc, char *argv[]) {
    QCoreApplication app(argc, argv);

    printf("Starting injector2...\n");

    HWND hwnd = FindWindowW(NULL, L"Secure Window 123");
    if (!hwnd) {
        printf("Window not found!\n");
        return 1;
    }

    printf("Window found. Modifying styles...\n");
    LONG_PTR exStyle = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
    exStyle |= WS_EX_LAYERED;
    if (!SetWindowLongPtrW(hwnd, GWL_EXSTYLE, exStyle)) {
        printf("Failed to set window styles! Error: %ld\n", GetLastError());
    } else {
        printf("Window styles modified successfully.\n");
    }

    if (!SetLayeredWindowAttributes(hwnd, 0, 180, LWA_ALPHA)) {
        printf("Failed to set layered window attributes!\n");
    } else {
        printf("Layered window attributes set successfully.\n");
    }

    if (!EnableDwmCloaking(hwnd)) {
        printf("Failed to enable DWM cloaking!\n");
    } else {
        printf("DWM cloaking enabled successfully.\n");
    }

    return app.exec();
}