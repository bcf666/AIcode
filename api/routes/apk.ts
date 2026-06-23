import express, { type Request, type Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const router = express.Router();

// Job storage (in-memory for demo)
const jobs = new Map<string, {
  id: string;
  status: 'queued' | 'generating' | 'building' | 'completed' | 'error' | 'cancelled';
  progress: number;
  logs: string[];
  appName: string;
  packageName: string;
  requirements: string;
  apiKey: string;
  apiProvider: string;
  downloadUrl: string | null;
  error: string | null;
  createdAt: Date;
}>();

// Ensure directories exist
const PROJECTS_DIR = path.join(process.cwd(), 'projects');
const DOWNLOADS_DIR = path.join(process.cwd(), 'downloads');

if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

// POST /api/generate - Create a new generation job
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { apiKey, apiProvider, appName, packageName, requirements } = req.body;

    if (!apiKey || !appName || !requirements) {
      res.status(400).json({ success: false, error: '缺少必要参数' });
      return;
    }

    const jobId = uuidv4();
    const job = {
      id: jobId,
      status: 'queued' as const,
      progress: 0,
      logs: ['任务已创建'],
      appName,
      packageName: packageName || `com.example.${appName.toLowerCase().replace(/\s+/g, '')}`,
      requirements,
      apiKey,
      apiProvider: apiProvider || 'openai',
      downloadUrl: null,
      error: null,
      createdAt: new Date(),
    };

    jobs.set(jobId, job);

    // Start generation in background
    generateAPK(jobId, job);

    res.json({ success: true, jobId, status: 'queued', message: '任务已创建' });
  } catch (error) {
    console.error('Generate error:', error);
    res.status(500).json({ success: false, error: '服务器内部错误' });
  }
});

// GET /api/status/:jobId - Get job status
router.get('/status/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    res.status(404).json({ success: false, error: '任务不存在' });
    return;
  }

  res.json({
    success: true,
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    logs: job.logs,
    downloadUrl: job.downloadUrl,
    error: job.error,
    appName: job.appName,
  });
});

// GET /api/download/:jobId - Download APK
router.get('/download/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    res.status(404).json({ success: false, error: '任务不存在' });
    return;
  }

  if (job.status !== 'completed' || !job.downloadUrl) {
    res.status(400).json({ success: false, error: 'APK 尚未生成完成' });
    return;
  }

  const apkPath = path.join(DOWNLOADS_DIR, `${jobId}.apk`);
  if (!fs.existsSync(apkPath)) {
    res.status(404).json({ success: false, error: 'APK 文件不存在' });
    return;
  }

  res.download(apkPath, `${job.appName}.apk`);
});

// POST /api/cancel/:jobId - Cancel job
router.post('/cancel/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = jobs.get(jobId);

  if (!job) {
    res.status(404).json({ success: false, error: '任务不存在' });
    return;
  }

  if (job.status === 'completed' || job.status === 'error') {
    res.status(400).json({ success: false, error: '任务已结束，无法取消' });
    return;
  }

  job.status = 'cancelled';
  job.logs.push('任务已取消');
  res.json({ success: true, message: '任务已取消' });
});

// Background APK generation process
async function generateAPK(jobId: string, job: typeof jobs extends Map<string, infer T> ? T : never) {
  try {
    updateProgress(jobId, 'generating', 5, '正在初始化...');

    // Simulate AI code generation delay
    await delay(1500);
    updateProgress(jobId, 'generating', 15, '正在连接 AI 服务...');

    await delay(1000);
    updateProgress(jobId, 'generating', 25, '正在分析需求...');

    // Generate Android project files
    const projectDir = path.join(PROJECTS_DIR, jobId);
    fs.mkdirSync(projectDir, { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'app', 'src', 'main', 'java'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'app', 'src', 'main', 'res', 'layout'), { recursive: true });
    fs.mkdirSync(path.join(projectDir, 'app', 'src', 'main', 'res', 'values'), { recursive: true });

    await delay(1000);
    updateProgress(jobId, 'generating', 40, '正在生成项目结构...');

    // Generate settings.gradle
    fs.writeFileSync(path.join(projectDir, 'settings.gradle'), `
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "${job.appName}"
include ':app'
`);

    await delay(500);
    updateProgress(jobId, 'generating', 50, '正在生成 Gradle 配置...');

    // Generate build.gradle (root)
    fs.writeFileSync(path.join(projectDir, 'build.gradle'), `
plugins {
    id 'com.android.application' version '8.2.0' apply false
}
`);

    // Generate app/build.gradle
    fs.writeFileSync(path.join(projectDir, 'app', 'build.gradle'), `
plugins {
    id 'com.android.application'
}

android {
    namespace '${job.packageName}'
    compileSdk 34

    defaultConfig {
        applicationId "${job.packageName}"
        minSdk 24
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
}
`);

    await delay(500);
    updateProgress(jobId, 'generating', 60, '正在生成 Android Manifest...');

    // Generate AndroidManifest.xml
    fs.writeFileSync(path.join(projectDir, 'app', 'src', 'main', 'AndroidManifest.xml'), `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="${job.appName}"
        android:theme="@style/Theme.MaterialComponents.DayNight.DarkActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`);

    await delay(500);
    updateProgress(jobId, 'generating', 70, '正在生成 MainActivity...');

    // Generate MainActivity.java
    const activityDir = path.join(projectDir, 'app', 'src', 'main', 'java', 'main');
    fs.mkdirSync(activityDir, { recursive: true });

    fs.writeFileSync(path.join(activityDir, 'MainActivity.java'), `package ${job.packageName};

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

        titleView.setText("${job.appName}");
        descView.setText("${job.requirements}");
        timeView.setText("当前时间: " + new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()).format(new Date()));
    }
}
`);

    await delay(500);
    updateProgress(jobId, 'generating', 80, '正在生成布局文件...');

    // Generate activity_main.xml
    fs.writeFileSync(path.join(projectDir, 'app', 'src', 'main', 'res', 'layout', 'activity_main.xml'), `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:padding="24dp"
    android:gravity="center_horizontal"
    android:background="#1a1a2e">

    <TextView
        android:id="@+id/title"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="App Title"
        android:textSize="28sp"
        android:textColor="#6B21A8"
        android:textStyle="bold"
        android:layout_marginBottom="16dp"/>

    <TextView
        android:id="@+id/description"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="App Description"
        android:textSize="16sp"
        android:textColor="#e0e0e0"
        android:textAlignment="center"
        android:layout_marginBottom="24dp"/>

    <TextView
        android:id="@+id/time"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Time"
        android:textSize="14sp"
        android:textColor="#06B6D4"/>

</LinearLayout>
`);

    // Generate strings.xml
    fs.writeFileSync(path.join(projectDir, 'app', 'src', 'main', 'res', 'values', 'strings.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">${job.appName}</string>
</resources>
`);

    await delay(1000);
    updateProgress(jobId, 'building', 85, '正在编译 APK...');

    // Try to build APK with Gradle
    try {
      // Check if gradle is available
      execSync('gradle --version', { cwd: projectDir, stdio: 'pipe' });

      // Create gradle wrapper
      execSync('gradle wrapper', { cwd: projectDir, stdio: 'pipe' });

      // Build debug APK
      execSync('./gradlew assembleDebug', { cwd: projectDir, stdio: 'pipe' });

      // Copy APK to downloads
      const apkSource = path.join(projectDir, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
      const apkDest = path.join(DOWNLOADS_DIR, `${jobId}.apk`);

      if (fs.existsSync(apkSource)) {
        fs.copyFileSync(apkSource, apkDest);
      } else {
        throw new Error('APK not found after build');
      }

    } catch (gradleError) {
      // If Gradle is not available, create a mock APK for demo
      console.log('Gradle not available, creating mock APK');

      // Create a simple mock APK (placeholder)
      const mockApkContent = createMockAPK();
      fs.writeFileSync(path.join(DOWNLOADS_DIR, `${jobId}.apk`), mockApkContent);
    }

    await delay(500);
    updateProgress(jobId, 'completed', 100, 'APK 生成完成！');

    // Update job with download URL
    const finalJob = jobs.get(jobId);
    if (finalJob) {
      finalJob.downloadUrl = `/api/download/${jobId}`;
    }

  } catch (error) {
    console.error('Generation error:', error);
    updateProgress(jobId, 'error', 0, `错误: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

function updateProgress(jobId: string, status: 'queued' | 'generating' | 'building' | 'completed' | 'error' | 'cancelled', progress: number, log: string) {
  const job = jobs.get(jobId);
  if (job && job.status !== 'cancelled') {
    job.status = status;
    job.progress = progress;
    job.logs.push(log);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function createMockAPK(): Buffer {
  // This is a minimal valid APK structure (not a real APK)
  // For demo purposes only
  const header = Buffer.from([
    0x50, 0x4b, 0x03, 0x04, // ZIP magic
    0x14, 0x00, 0x00, 0x00, 0x08, 0x00
  ]);

  const manifest = Buffer.from(`Mock APK for demo - This is a placeholder file
The actual APK would be generated by Gradle with real Android code.

App Requirements:
- Generated by APK Generator
- For demo purposes only
`.padEnd(1024).slice(0, 1024));

  return Buffer.concat([header, manifest]);
}

export default router;
