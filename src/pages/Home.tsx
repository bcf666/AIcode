import { useState, useEffect, useRef } from 'react';
import { Sparkles, Download, Loader2, AlertCircle, CheckCircle2, X } from 'lucide-react';

interface JobStatus {
  jobId: string;
  status: 'queued' | 'generating' | 'building' | 'completed' | 'error' | 'cancelled';
  progress: number;
  logs: string[];
  downloadUrl: string | null;
  error: string | null;
  appName: string;
}

const API_PROVIDERS = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'claude', label: 'Claude' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'deepseek', label: 'DeepSeek' },
];

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [apiProvider, setApiProvider] = useState('openai');
  const [appName, setAppName] = useState('');
  const [packageName, setPackageName] = useState('');
  const [requirements, setRequirements] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [jobStatus?.logs]);

  const handleGenerate = async () => {
    if (!apiKey || !appName || !requirements) {
      alert('请填写所有必填字段');
      return;
    }

    setIsGenerating(true);
    setJobStatus(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          apiProvider,
          appName,
          packageName: packageName || undefined,
          requirements,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setJobId(data.jobId);
      } else {
        alert(data.error || '创建任务失败');
        setIsGenerating(false);
      }
    } catch (error) {
      console.error('Generate error:', error);
      alert('网络错误，请重试');
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (!jobId) return;

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/status/${jobId}`);
        const data = await response.json();
        if (data.success) {
          setJobStatus(data);
          if (data.status === 'completed' || data.status === 'error' || data.status === 'cancelled') {
            setIsGenerating(false);
          }
        }
      } catch (error) {
        console.error('Status poll error:', error);
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, [jobId]);

  const handleDownload = () => {
    if (jobStatus?.downloadUrl) {
      window.location.href = jobStatus.downloadUrl;
    }
  };

  const handleCancel = async () => {
    if (!jobId) return;
    try {
      await fetch(`/api/cancel/${jobId}`, { method: 'POST' });
      setIsGenerating(false);
    } catch (error) {
      console.error('Cancel error:', error);
    }
  };

  const handleReset = () => {
    setApiKey('');
    setAppName('');
    setPackageName('');
    setRequirements('');
    setJobId(null);
    setJobStatus(null);
    setIsGenerating(false);
  };

  const getStatusIcon = () => {
    if (!jobStatus) return null;
    switch (jobStatus.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'cancelled':
        return <X className="w-5 h-5 text-gray-400" />;
      default:
        return <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 text-white relative overflow-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }} />
      </div>

      {/* Floating orbs */}
      <div className="absolute top-1/4 -left-32 w-64 h-64 bg-purple-600/30 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-cyan-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 mb-4">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-purple-300">AI 驱动的应用生成器</span>
          </div>
          <h1 className="text-4xl font-bold mb-3">
            <span className="bg-gradient-to-r from-purple-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent">
              APK 生成器
            </span>
          </h1>
          <p className="text-slate-400">输入你的 AI API Key，描述你的应用需求，即可生成 Android 安装包</p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl border border-slate-700/50 p-8 shadow-2xl">
          {/* API Configuration */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-sm">1</span>
              API 配置
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">API 供应商</label>
                <input
                  type="text"
                  value={apiProvider}
                  onChange={(e) => setApiProvider(e.target.value)}
                  placeholder="如：openai, claude, gemini..."
                  disabled={isGenerating}
                  className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all disabled:opacity-50 mb-2"
                />
                <div className="flex flex-wrap gap-2">
                  {API_PROVIDERS.map((p) => (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setApiProvider(p.value)}
                      disabled={isGenerating}
                      className={`px-3 py-1 text-xs rounded-full transition-all ${
                        apiProvider === p.value
                          ? 'bg-purple-600 text-white'
                          : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600/50'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                  disabled={isGenerating}
                  className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* App Configuration */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-sm">2</span>
              应用配置
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">应用名称 <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="我的应用"
                  disabled={isGenerating}
                  className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-2">包名（可选）</label>
                <input
                  type="text"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="com.example.myapp"
                  disabled={isGenerating}
                  className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          {/* Requirements */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-sm">3</span>
              应用需求 <span className="text-red-400">*</span>
            </h2>
            <textarea
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="描述你的应用功能和界面要求..."
              rows={5}
              disabled={isGenerating}
              className="w-full bg-slate-800/50 border border-slate-600/50 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all resize-none disabled:opacity-50"
            />
          </div>

          {/* Action Buttons */}
          {!isGenerating && !jobStatus && (
            <button
              onClick={handleGenerate}
              disabled={!apiKey || !appName || !requirements}
              className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="w-5 h-5" />
                生成 APK
              </span>
            </button>
          )}

          {/* Progress Section */}
          {isGenerating && jobStatus && (
            <div className="space-y-6">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-400">生成进度</span>
                  <span className="text-cyan-400">{jobStatus.progress}%</span>
                </div>
                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 transition-all duration-500 ease-out"
                    style={{ width: `${jobStatus.progress}%` }}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center gap-3 p-4 bg-slate-800/30 rounded-xl">
                {getStatusIcon()}
                <div className="flex-1">
                  <p className="font-medium text-white">
                    {jobStatus.status === 'queued' && '等待开始...'}
                    {jobStatus.status === 'generating' && '正在生成代码...'}
                    {jobStatus.status === 'building' && '正在编译 APK...'}
                    {jobStatus.status === 'completed' && '生成完成!'}
                    {jobStatus.status === 'error' && '生成失败'}
                    {jobStatus.status === 'cancelled' && '已取消'}
                  </p>
                  <p className="text-sm text-slate-400">{jobStatus.logs[jobStatus.logs.length - 1]}</p>
                </div>
              </div>

              {/* Logs */}
              <div className="bg-slate-950/50 rounded-xl p-4 h-48 overflow-y-auto font-mono text-sm">
                {jobStatus.logs.map((log, i) => (
                  <div key={i} className="text-slate-400 py-1">
                    <span className="text-slate-600 mr-2">[{String(i + 1).padStart(3, '0')}]</span>
                    {log}
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>

              {/* Cancel Button */}
              {jobStatus.status !== 'completed' && jobStatus.status !== 'error' && (
                <button
                  onClick={handleCancel}
                  className="w-full py-3 rounded-xl font-medium text-slate-400 bg-slate-800/50 hover:bg-slate-700/50 transition-all"
                >
                  取消生成
                </button>
              )}
            </div>
          )}

          {/* Download Section */}
          {jobStatus?.status === 'completed' && jobStatus.downloadUrl && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-green-400" />
                <div>
                  <p className="font-medium text-green-400">APK 生成成功!</p>
                  <p className="text-sm text-slate-400">{jobStatus.appName}.apk 已准备好下载</p>
                </div>
              </div>
              <button
                onClick={handleDownload}
                className="w-full py-4 rounded-xl font-semibold text-white bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-500 hover:to-cyan-500 transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-green-500/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" />
                  下载 APK
                </span>
              </button>
              <button
                onClick={handleReset}
                className="w-full py-3 rounded-xl font-medium text-slate-400 bg-slate-800/50 hover:bg-slate-700/50 transition-all"
              >
                生成新的应用
              </button>
            </div>
          )}

          {/* Error Section */}
          {jobStatus?.status === 'error' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <AlertCircle className="w-8 h-8 text-red-400" />
                <div>
                  <p className="font-medium text-red-400">生成失败</p>
                  <p className="text-sm text-slate-400">{jobStatus.error}</p>
                </div>
              </div>
              <button
                onClick={handleReset}
                className="w-full py-3 rounded-xl font-medium text-slate-400 bg-slate-800/50 hover:bg-slate-700/50 transition-all"
              >
                重试
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-8">
          输入你的 API Key 开始创建应用 · 所有处理在本地完成
        </p>
      </div>
    </div>
  );
}
