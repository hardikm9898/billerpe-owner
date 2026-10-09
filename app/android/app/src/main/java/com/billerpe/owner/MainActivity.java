package com.billerpe.owner;

import android.graphics.Color;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BarsPlugin.class);
        super.onCreate(savedInstanceState);
        // Clear of the status bar, notch and gesture bar on every phone.
        EdgeInsets.apply(this, Color.parseColor("#F5F1EC"), Color.parseColor("#FFFFFF"), false);
    }
}
