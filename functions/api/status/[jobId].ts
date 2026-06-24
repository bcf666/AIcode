import { getJob } from '../../_utils';

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

  return new Response(JSON.stringify({
    success: true,
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    logs: job.logs,
    downloadUrl: job.downloadUrl,
    error: job.error,
    appName: job.appName,
  }), {
    headers: {
      'Content-Type': 'application/json',
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
