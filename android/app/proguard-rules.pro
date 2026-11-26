# Capacitor Core & Plugins
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep @com.getcapacitor.annotation.Permission class * { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.PermissionCallback <methods>;
}

# Capacitor Firebase Authentication & Google Sign-In
-keep class io.capawesome.capacitorjs.plugins.firebase.authentication.** { *; }
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.auth.** { *; }

# MainActivity WebView JavaScript Bridge (OTG Keyboard Detection)
-keepclassmembers class in.srikalaimagal.typingthalaiva.MainActivity$NativeKeyboardBridge {
    @android.webkit.JavascriptInterface <methods>;
    public *;
}

# Preserve line numbers for Crashlytics / Play Console stack traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
