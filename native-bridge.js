(function (window) {
  'use strict';
  const methods = ['getCapabilities', 'startTask', 'updateTask', 'endTask', 'downloadFile', 'saveFile', 'syncSchedule'];
  const maxBase64Bytes = 20 * 1024 * 1024;
  const maxDownloadBytes = 200 * 1024 * 1024;
  let registered;

  function nativePlugin() {
    const cap = window.Capacitor;
    if (!cap) return null;
    // Capacitor 8's Android/iOS JSExport injects these methods before page scripts.
    const injected = cap.Plugins && cap.Plugins.GuanchaoNative;
    if (injected && typeof injected.getCapabilities === 'function') return injected;
    const header = Array.isArray(cap.PluginHeaders) && cap.PluginHeaders.find(item => item.name === 'GuanchaoNative');
    if (!header) return null;
    if (typeof cap.registerPlugin === 'function') {
      registered = registered || cap.registerPlugin('GuanchaoNative');
      return registered;
    }
    // Native-only fallback when @capacitor/core has not been bundled as a JS module.
    if (typeof cap.nativePromise === 'function') {
      return Object.fromEntries(methods.map(method => [method, options => cap.nativePromise('GuanchaoNative', method, options || {})]));
    }
    return null;
  }

  function callNative(method, options) {
    const plugin = nativePlugin();
    if (!plugin || typeof plugin[method] !== 'function') {
      if (method === 'getCapabilities') {
        return Promise.resolve({ platform: 'web', liveActivities: false, taskNotifications: false,
          backgroundProcessing: false, fileExports: false, nativeHttp: false, scheduleWidgets: false, maxBase64Bytes, maxDownloadBytes });
      }
      if (['startTask', 'updateTask', 'endTask'].includes(method)) {
        return Promise.resolve({ presented: false, reason: 'web_platform' });
      }
      if (method === 'syncSchedule') return Promise.resolve({ synced: false, reason: 'web_platform' });
      const error = new Error('当前浏览器使用网页文件导出。');
      error.code = 'NATIVE_UNAVAILABLE';
      return Promise.reject(error);
    }
    try { return Promise.resolve(plugin[method](options || {})); }
    catch (error) { return Promise.reject(error); }
  }

  const api = {
    get available() { return !!nativePlugin(); },
    maxBase64Bytes,
    maxDownloadBytes,
    getCapabilities: () => callNative('getCapabilities'),
    startTask: options => callNative('startTask', options),
    updateTask: options => callNative('updateTask', options),
    endTask: options => callNative('endTask', options),
    downloadFile: options => callNative('downloadFile', options),
    syncSchedule: options => callNative('syncSchedule', options),
    saveFile: options => {
      const encoded = String(options && options.base64 || '').replace(/^data:[^,]*,/, '');
      if (!encoded || encoded.length > Math.ceil(maxBase64Bytes / 3) * 4 + 8) {
        const error = new Error('原生本地文件导出限 20 MB，请使用网页或桌面版处理较大文件。');
        error.code = 'EXPORT_LIMIT';
        return Promise.reject(error);
      }
      return callNative('saveFile', { ...options, base64: encoded });
    }
  };
  window.GuanchaoNativeAPI = Object.freeze(api);
})(window);
