import { generateId, setJob, simulateGeneration } from '../_utils';

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json();
    const { apiKey, apiProvider, appName, packageName, requirements } = body;

    if (!apiKey || !appName || !requirements) {
      return new Response(JSON.stringify({
        success: false,
        error: '缺少必要参数'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const jobId = generateId();
    const job = {
      id: jobId,
      status: 'queued' as const,
      progress: 0,
      logs: ['任务已创建'],
      appName,
      packageName: packageName || `com.example.${appName.toLowerCase().replace(/\s+/g, '')}`,
      requirements,
      apiKey,
      apiBaseUrl: apiProvider || 'https://api.openai.com/v1',
      downloadUrl: null,
      error: null,
      createdAt: Date.now(),
    };

    setJob(jobId, job);

    context.waitUntil(simulateGeneration(jobId, job));

    return new Response(JSON.stringify({
      success: true,
      jobId,
      status: 'queued',
      message: '任务已创建'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Generate error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: '服务器内部错误'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
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
