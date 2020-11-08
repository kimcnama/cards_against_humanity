package com.pah;

import android.os.Bundle;
import android.os.PersistableBundle;

import com.facebook.react.ReactActivity;
import org.devio.rn.splashscreen.SplashScreen;

import androidx.annotation.Nullable;

public class MainActivity extends ReactActivity {

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  @Override
  protected String getMainComponentName() {
    return "PAH";
  }

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    SplashScreen.show(this);  // here
    super.onCreate(savedInstanceState);
  }
}
