import { getJob, createMockAPK } from '../../_utils';

export async function onRequestGet(context: any) {
  const { jobId } = context.params;
  const job = getJob(jobId);

  if (!job) {
    return new Response(JSON.stringify({
      success: false,
      error: '任务不存在'
    }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  if (job.status !== 'completed') {
    return new Response(JSON.stringify({
      success: false,
      error: 'APK 尚未生成完成'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  const apkContent = createMockAPK();

  return new Response(apkContent, {
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': `attachment; filename="${job.appName}.apk"`,
      'Access-Control-Allow-Origin': '*'
    }
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
