#include <QCoreApplication>
#include <windows.h>
#include <dwmapi.h>
#include <cstdio>

// Don't redefine DWMWA_CLOAK as it's already defined in dwmapi.h
// Use a different name for the cloaking value
const DWORD CLOAKED_APP_VALUE = 1;

BOOL EnableDwmCloaking(HWND hwnd) {
    printf("Enabling DWM cloaking...\n");
    // Use DWMWA_CLOAK from dwmapi.h and our custom value
    DWORD cloakValue = CLOAKED_APP_VALUE;
    HRESULT hr = DwmSetWindowAttribute(hwnd, DWMWA_CLOAK, &cloakValue, sizeof(cloakValue));
    if (hr != S_OK) {
        printf("DwmSetWindowAttribute failed! HRESULT: 0x%08lx\n", hr);
        return FALSE;
    }
    printf("DWM cloaking successful\n");
    return TRUE;
}

int main(int argc, char *argv[]) {
    QCoreApplication app(argc, argv);

    printf("Starting injector with PID: %lu\n", GetCurrentProcessId());
    
    // Try to find window several times with a delay
    HWND hwnd = NULL;
    for (int i = 0; i < 10 && !hwnd; i++) {
        hwnd = FindWindowW(NULL, L"Secure Window 123");
        if (!hwnd) {
            printf("Window not found, attempt %d/10. Waiting...\n", i+1);
            Sleep(500); // Wait 500ms before retrying
        }
    }
    
    if (!hwnd) {
        printf("Window not found after multiple attempts! Make sure the Electron app is running.\n");
        return 1;
    }

    printf("Window found. Handle: 0x%p\n", hwnd);
    
    // Get the process ID of the window to verify we're targeting the right one
    DWORD targetPID;
    GetWindowThreadProcessId(hwnd, &targetPID);
    printf("Target window PID: %lu\n", targetPID);

    // Set window styles for transparency
    printf("Modifying window styles...\n");
    LONG_PTR exStyle = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
    exStyle |= WS_EX_LAYERED | WS_EX_TRANSPARENT; // Add WS_EX_TRANSPARENT to pass mouse events through
    if (!SetWindowLongPtrW(hwnd, GWL_EXSTYLE, exStyle)) {
        printf("Failed to set window styles! Error: %ld\n", GetLastError());
    } else {
        printf("Window styles modified successfully.\n");
    }

    // Set transparency level
    if (!SetLayeredWindowAttributes(hwnd, 0, 190, LWA_ALPHA)) { // 50% transparency
        printf("Failed to set layered window attributes! Error: %ld\n", GetLastError());
    } else {
        printf("Layered window attributes set successfully. Window is now semi-transparent.\n");
    }

    // Try to enable DWM cloaking
    if (!EnableDwmCloaking(hwnd)) {
        printf("Failed to enable DWM cloaking!\n");
    } else {
        printf("DWM cloaking enabled successfully.\n");
    }

    printf("All operations completed. Press Ctrl+C to exit.\n");

    return app.exec();
}