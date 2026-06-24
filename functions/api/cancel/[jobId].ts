import { getJob } from '../../_utils';

export async function onRequestPost(context: any) {
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

  if (job.status === 'completed' || job.status === 'error') {
    return new Response(JSON.stringify({
      success: false,
      error: '任务已结束，无法取消'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  job.status = 'cancelled';
  job.logs.push('任务已取消');

  return new Response(JSON.stringify({
    success: true,
    message: '任务已取消'
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
