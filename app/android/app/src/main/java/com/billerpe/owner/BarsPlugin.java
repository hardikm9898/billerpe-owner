package com.billerpe.owner;

import android.graphics.Color;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** The app's light / dark theme for the strips behind the status and gesture bars (EdgeInsets). */
@CapacitorPlugin(name = "Bars")
public class BarsPlugin extends Plugin {
    @PluginMethod
    public void setColors(PluginCall call) {
        int top;
        int bottom;
        try {
            top = Color.parseColor(call.getString("top", "#F5F1EC"));
            bottom = Color.parseColor(call.getString("bottom", "#FFFFFF"));
        } catch (IllegalArgumentException e) {
            call.reject("Bad colour");
            return;
        }
        boolean dark = Boolean.TRUE.equals(call.getBoolean("dark", false));
        getActivity().runOnUiThread(() -> {
            EdgeInsets.setColors(getActivity(), top, bottom, dark);
            call.resolve();
        });
    }
}
