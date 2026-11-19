package in.srikalaimagal.typingthalaiva;

import android.content.Context;
import android.content.res.Configuration;
import android.hardware.input.InputManager;
import android.os.Bundle;
import android.view.InputDevice;
import android.view.WindowManager;
import android.view.inputmethod.InputMethodManager;
import android.webkit.JavascriptInterface;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity implements InputManager.InputDeviceListener {

    private InputManager inputManager;

    public class NativeKeyboardBridge {
        @JavascriptInterface
        public boolean isPhysicalKeyboardConnected() {
            return MainActivity.this.checkPhysicalKeyboardConnected();
        }

        @JavascriptInterface
        public String getConnectedKeyboardName() {
            return MainActivity.this.getPhysicalKeyboardName();
        }

        @JavascriptInterface
        public void hideVirtualKeyboard() {
            MainActivity.this.hideVirtualKeyboard();
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        inputManager = (InputManager) getSystemService(Context.INPUT_SERVICE);
        if (inputManager != null) {
            inputManager.registerInputDeviceListener(this, null);
        }

        if (bridge != null && bridge.getWebView() != null) {
            bridge.getWebView().addJavascriptInterface(new NativeKeyboardBridge(), "AndroidKeyboardBridge");
        }

        applyKeyboardMode();
    }

    @Override
    public void onResume() {
        super.onResume();
        applyKeyboardMode();
        notifyWebOfKeyboardStatus();
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (inputManager != null) {
            inputManager.unregisterInputDeviceListener(this);
        }
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        applyKeyboardMode();
        notifyWebOfKeyboardStatus();
    }

    // InputDeviceListener callbacks
    @Override
    public void onInputDeviceAdded(int deviceId) {
        applyKeyboardMode();
        notifyWebOfKeyboardStatus();
    }

    @Override
    public void onInputDeviceRemoved(int deviceId) {
        applyKeyboardMode();
        notifyWebOfKeyboardStatus();
    }

    @Override
    public void onInputDeviceChanged(int deviceId) {
        applyKeyboardMode();
        notifyWebOfKeyboardStatus();
    }

    public boolean checkPhysicalKeyboardConnected() {
        if (inputManager != null) {
            int[] deviceIds = inputManager.getInputDeviceIds();
            for (int id : deviceIds) {
                InputDevice device = inputManager.getInputDevice(id);
                if (device != null && !device.isVirtual()) {
                    int sources = device.getSources();
                    if ((sources & InputDevice.SOURCE_KEYBOARD) == InputDevice.SOURCE_KEYBOARD 
                        && device.getKeyboardType() == InputDevice.KEYBOARD_TYPE_ALPHABETIC) {
                        return true;
                    }
                }
            }
        }
        Configuration config = getResources().getConfiguration();
        return config.keyboard != Configuration.KEYBOARD_NOKEYS;
    }

    public String getPhysicalKeyboardName() {
        if (inputManager != null) {
            int[] deviceIds = inputManager.getInputDeviceIds();
            for (int id : deviceIds) {
                InputDevice device = inputManager.getInputDevice(id);
                if (device != null && !device.isVirtual()) {
                    int sources = device.getSources();
                    if ((sources & InputDevice.SOURCE_KEYBOARD) == InputDevice.SOURCE_KEYBOARD 
                        && device.getKeyboardType() == InputDevice.KEYBOARD_TYPE_ALPHABETIC) {
                        return device.getName();
                    }
                }
            }
        }
        return "Standard Physical Keyboard";
    }

    public void hideVirtualKeyboard() {
        runOnUiThread(() -> {
            InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
            if (imm != null && getCurrentFocus() != null) {
                imm.hideSoftInputFromWindow(getCurrentFocus().getWindowToken(), 0);
            }
        });
    }

    private void applyKeyboardMode() {
        runOnUiThread(() -> {
            boolean isPhysical = checkPhysicalKeyboardConnected();
            if (isPhysical) {
                getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN);
                hideVirtualKeyboard();
            } else {
                getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
            }
        });
    }

    private void notifyWebOfKeyboardStatus() {
        if (bridge == null || bridge.getWebView() == null) return;
        final boolean connected = checkPhysicalKeyboardConnected();
        final String name = getPhysicalKeyboardName().replace("'", "\\'");

        bridge.getWebView().post(() -> {
            String js = "if(window.onOTGKeyboardStateChanged){ window.onOTGKeyboardStateChanged(" + connected + ", '" + name + "'); }" +
                        "window.dispatchEvent(new CustomEvent('otg-keyboard-status', { detail: { connected: " + connected + ", deviceName: '" + name + "' } }));";
            bridge.getWebView().evaluateJavascript(js, null);
        });
    }
}
