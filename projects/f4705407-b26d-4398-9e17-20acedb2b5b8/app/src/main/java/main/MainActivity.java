package com.test.app;

import android.os.Bundle;
import android.widget.TextView;
import androidx.appcompat.app.AppCompatActivity;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        TextView titleView = findViewById(R.id.title);
        TextView descView = findViewById(R.id.description);
        TextView timeView = findViewById(R.id.time);

        titleView.setText("测试应用");
        descView.setText("一个简单的测试应用");
        timeView.setText("当前时间: " + new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(new Date()));
    }
}
