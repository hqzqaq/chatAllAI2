/**
 * 文件上传脚本工具类
 * 提供不同AI网站的文件上传注入脚本
 *
 * @author huquanzhi
 * @since 2026-05-23 10:30
 * @version 2.0
 */

import { resolveScript } from './ScriptResolver'

export interface UploadFileData {
  name: string
  mimeType: string
  base64: string
}

/**
 * 有特殊上传实现的 provider 映射表
 * 其他 provider 都使用通用上传脚本
 */
const customUploadScriptGenerators: Record<string, (file: UploadFileData) => string> = {
  chatgpt: getChatGPTUploadScript,
  gemini: getGeminiUploadScript,
  deepseek: getDeepSeekUploadScript,
  kimi: getKimiUploadScript,
  doubao: getDouBaoUploadScript,
  yuanbao: getYuanBaoUploadScript,
  glm: getGLMUploadScript,
  mimo: getMimoUploadScript
}

/**
 * 获取文件上传注入脚本
 * @param providerId AI提供商ID
 * @param file 文件数据
 * @returns 注入到webview中执行的JavaScript脚本
 */
export function getFileUploadScript(providerId: string, file: UploadFileData): string {
  const customGenerator = customUploadScriptGenerators[providerId]
  const defaultScript = customGenerator ? customGenerator(file) : getGenericUploadScript(file)
  return resolveScript(providerId, 'fileUpload', defaultScript, {
    name: file.name,
    mimeType: file.mimeType,
    base64: file.base64
  })
}

/**
 * 公共辅助脚本片段：base64 → File对象的构建函数
 */
function getBase64ToFileCode(file: UploadFileData): string {
  return `
function base64ToFile() {
  var base64 = '${file.base64}';
  var name = '${file.name}';
  var mimeType = '${file.mimeType}';
  var byteChars = atob(base64);
  var bytes = new Uint8Array(byteChars.length);
  for (var i = 0; i < byteChars.length; i++) {
    bytes[i] = byteChars.charCodeAt(i);
  }
  var blob = new Blob([bytes], { type: mimeType });
  var file = new File([blob], name, { type: mimeType, lastModified: Date.now() });
  console.log('[FileUpload] base64ToFile: name=' + name + ' size=' + file.size + ' type=' + file.type);
  return { file: file, blob: blob };
}`
}

/**
 * 公共辅助脚本片段：将File对象注入到file input
 */
function getInjectToInputCode(): string {
  return `
function injectToInput(fileObj, inputEl) {
  var dt = new DataTransfer();
  dt.items.add(fileObj.file);

  // 策略1: 使用原生 setter（对 React 控件的传统方式）
  try {
    var nativeSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'files'
    );
    if (nativeSetter && nativeSetter.set) {
      nativeSetter.set.call(inputEl, dt.files);
      console.log('[FileUpload] injectToInput: native setter applied');
    }
  } catch (e) {
    console.warn('[FileUpload] injectToInput: native setter failed', e.message);
    inputEl.files = dt.files;
  }

  // 策略2: 同时尝试直接赋值（有些框架的 getter 会拦截原生 setter）
  try {
    inputEl.files = dt.files;
  } catch (e2) {
    console.warn('[FileUpload] injectToInput: direct assignment failed', e2.message);
  }

  // 策略3: 触发多种事件，覆盖不同框架的事件处理方式
  var eventTypes = [
    { type: 'change', init: function(e) { return new Event('change', { bubbles: true }); } },
    { type: 'input', init: function(e) { return new Event('input', { bubbles: true }); } }
  ];

  for (var ev = 0; ev < eventTypes.length; ev++) {
    try {
      var evt = eventTypes[ev].init();
      // 有些框架检查 isTrusted，尝试绕过
      Object.defineProperty(evt, 'target', { value: inputEl, writable: false });
      inputEl.dispatchEvent(evt);
    } catch (e3) {
      console.warn('[FileUpload] Failed to dispatch ' + eventTypes[ev].type, e3.message);
    }
  }

  // 策略4: React 特定 - 尝试触发 input 的 _valueTracker（React 用这个跟踪值变化）
  try {
    var tracker = inputEl._valueTracker;
    if (tracker) {
      tracker.setValue('dummy');
      console.log('[FileUpload] injectToInput: React _valueTracker triggered');
    }
  } catch (e4) {
    // 不是 React 或没有 _valueTracker，正常
  }

  console.log('[FileUpload] injectToInput: completed, files.length=' + inputEl.files.length);
}`
}

/**
 * ChatGPT 文件上传脚本
 * ChatGPT 使用隐藏的 input[type="file"]，需要通过上传按钮触发
 */
function getChatGPTUploadScript(file: UploadFileData): string {
  return `(function() {
  console.log('[FileUpload:ChatGPT] START');
  ${getBase64ToFileCode(file)}
  ${getInjectToInputCode()}

  var fileObj = base64ToFile();

  // 先查找所有 file input
  var allInputs = document.querySelectorAll('input[type="file"]');
  console.log('[FileUpload:ChatGPT] Found ' + allInputs.length + ' file input(s)');

  for (var i = 0; i < allInputs.length; i++) {
    console.log('[FileUpload:ChatGPT] Input[' + i + ']: display=' + allInputs[i].style.display
      + ' parent=' + (allInputs[i].parentElement ? allInputs[i].parentElement.tagName : 'none'));
  }

  // ChatGPT 的上传按钮触发
  var uploadBtn = document.querySelector('[data-testid="file-upload-button"]');
  if (uploadBtn) {
    console.log('[FileUpload:ChatGPT] Found upload button, clicking...');
    uploadBtn.click();
  }

  // 等待文件选择器出现再注入
  setTimeout(function() {
    var inputs = document.querySelectorAll('input[type="file"]');
    var target = null;
    for (var j = 0; j < inputs.length; j++) {
      if (inputs[j].offsetParent !== null || getComputedStyle(inputs[j]).display !== 'none') {
        target = inputs[j];
        break;
      }
    }
    if (!target) target = inputs[0];

    if (target) {
      console.log('[FileUpload:ChatGPT] Injecting into input:', target);
      injectToInput(fileObj, target);
      return true;
    }
    console.warn('[FileUpload:ChatGPT] No file input found for injection');
    return false;
  }, 800);

  // 兜底：注入到第一个 file input
  setTimeout(function() {
    var fallback = document.querySelector('input[type="file"]');
    if (fallback) {
      console.log('[FileUpload:ChatGPT] Fallback injection');
      injectToInput(fileObj, fallback);
    }
  }, 1500);

  return 'pending';
})()`
}

/**
 * Gemini 文件上传脚本
 * Gemini 使用 Angular Material 菜单：点击输入区 "Upload & tools" 按钮 ->
 * 选择 "Upload files" 菜单项 -> 动态创建隐藏的 input[type="file"] 并触发点击。
 * 策略：拦截 HTMLInputElement.click 防止弹出系统文件框，同时用 MutationObserver
 * 捕获动态出现的 file input，注入文件；兜底使用拖拽上传。
 */
function getGeminiUploadScript(file: UploadFileData): string {
  return `(function() {
  console.log('[FileUpload:Gemini] ========== START ==========');
  console.log('[FileUpload:Gemini] File: name=${file.name} type=${file.mimeType}');
  console.log('[FileUpload:Gemini] URL: ' + window.location.href);

  ${getBase64ToFileCode(file)}
  ${getInjectToInputCode()}

  var fileObj = base64ToFile();
  var injectDone = false;
  var capturedInput = null;

  // 拦截原生 file input 的 click，避免弹出系统文件选择框
  var originalInputClick = HTMLInputElement.prototype.click;
  HTMLInputElement.prototype.click = function() {
    if (this.type === 'file') {
      console.log('[FileUpload:Gemini] Intercepted file input click');
      capturedInput = this;
      return;
    }
    return originalInputClick.apply(this, arguments);
  };

  // MutationObserver 捕获动态创建的 file input
  var observer = new MutationObserver(function(mutations) {
    if (injectDone) return;
    for (var m = 0; m < mutations.length; m++) {
      var added = mutations[m].addedNodes;
      for (var n = 0; n < added.length; n++) {
        var node = added[n];
        if (node.nodeType !== 1) continue;
        var inputs = [];
        if (node.tagName === 'INPUT' && node.type === 'file') inputs.push(node);
        if (node.querySelectorAll) inputs.push.apply(inputs, node.querySelectorAll('input[type="file"]'));
        for (var k = 0; k < inputs.length; k++) {
          var inp = inputs[k];
          if (!inp.files || inp.files.length === 0) {
            console.log('[FileUpload:Gemini] Observer caught file input');
            injectToInput(fileObj, inp);
            injectDone = true;
            observer.disconnect();
            return;
          }
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  /**
   * 查找 "Upload & tools" 触发按钮（多语言兼容）
   */
  function findUploadToolsButton() {
    var btns = document.querySelectorAll('button');
    for (var i = 0; i < btns.length; i++) {
      var label = btns[i].getAttribute('aria-label') || '';
      if (label.indexOf('Upload & tools') >= 0 || label.indexOf('上传和工具') >= 0) {
        return btns[i];
      }
    }
    // fallback：按文本匹配
    for (var j = 0; j < btns.length; j++) {
      var text = (btns[j].textContent || '').trim();
      if (text === 'Upload & tools' || text === '上传和工具' ||
          text === 'New' || text === '新建') {
        return btns[j];
      }
    }
    return null;
  }

  /**
   * 查找 "Upload files" 菜单项（data-test-id 优先，支持多语言）
   */
  function findUploadFilesMenuItem() {
    var item = document.querySelector('[data-test-id="local-images-files-uploader-button"]');
    if (item) return item;
    var items = document.querySelectorAll('[role="menuitem"]');
    for (var i = 0; i < items.length; i++) {
      var label = items[i].getAttribute('aria-label') || '';
      var text = (items[i].textContent || '').trim();
      if (label.indexOf('Upload files') >= 0 || label.indexOf('上传文件') >= 0 ||
          text.indexOf('Upload files') >= 0 || text.indexOf('上传文件') >= 0 ||
          text.indexOf('Files') >= 0 || text.indexOf('文件') >= 0) {
        return items[i];
      }
    }
    return null;
  }

  var uploadToolsBtn = findUploadToolsButton();
  if (!uploadToolsBtn) {
    console.warn('[FileUpload:Gemini] Upload tools button not found');
    HTMLInputElement.prototype.click = originalInputClick;
    observer.disconnect();
    return { success: false, message: 'Upload tools button not found' };
  }
  console.log('[FileUpload:Gemini] Clicking upload tools button');
  uploadToolsBtn.click();

  // 等待菜单弹出后点击 "Upload files"
  setTimeout(function() {
    if (injectDone) return;
    var uploadItem = findUploadFilesMenuItem();
    if (!uploadItem) {
      console.warn('[FileUpload:Gemini] Upload files menuitem not found');
      return;
    }
    console.log('[FileUpload:Gemini] Clicking upload files menuitem');
    uploadItem.click();
  }, 300);

  // 最终兜底：直接注入或拖拽
  setTimeout(function() {
    if (injectDone) {
      HTMLInputElement.prototype.click = originalInputClick;
      observer.disconnect();
      return;
    }

    if (capturedInput) {
      console.log('[FileUpload:Gemini] Injecting into captured file input');
      injectToInput(fileObj, capturedInput);
      injectDone = true;
      HTMLInputElement.prototype.click = originalInputClick;
      observer.disconnect();
      return;
    }

    var inputs = document.querySelectorAll('input[type="file"]');
    console.log('[FileUpload:Gemini] File inputs on page: ' + inputs.length);
    if (inputs.length > 0) {
      injectToInput(fileObj, inputs[0]);
      injectDone = true;
      HTMLInputElement.prototype.click = originalInputClick;
      observer.disconnect();
      return;
    }

    // 兜底：拖拽上传到输入区
    console.log('[FileUpload:Gemini] Trying drag-and-drop fallback');
    var dropTarget = document.querySelector('textarea')
      || document.querySelector('[role="textbox"]')
      || document.body;
    try {
      var dt = new DataTransfer();
      dt.items.add(fileObj.file);
      ['dragenter', 'dragover', 'drop'].forEach(function(type) {
        var evt = new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt });
        dropTarget.dispatchEvent(evt);
      });
      console.log('[FileUpload:Gemini] Drag/drop dispatched on ' + dropTarget.tagName);
      injectDone = true;
    } catch (e) {
      console.warn('[FileUpload:Gemini] Drag/drop failed:', e.message);
    }

    HTMLInputElement.prototype.click = originalInputClick;
    observer.disconnect();
  }, 1200);

  return 'pending';
})()`
}

/**
 * DeepSeek 文件上传脚本
 * DeepSeek 基于 React，使用 textarea 作为聊天输入，文件上传按钮在输入区附近
 */
function getDeepSeekUploadScript(file: UploadFileData): string {
  return `(function() {
  console.log('[FileUpload:DeepSeek] ========== START ==========');
  console.log('[FileUpload:DeepSeek] File: name=${file.name} type=${file.mimeType}');
  console.log('[FileUpload:DeepSeek] URL: ' + window.location.href);

  ${getBase64ToFileCode(file)}
  ${getInjectToInputCode()}

  var fileObj = base64ToFile();

  // Step 1: 扫描 textarea 附近的 DOM
  var textarea = document.querySelector('textarea');
  console.log('[FileUpload:DeepSeek] Step1: textarea found=' + !!textarea);

  var inputArea = textarea ? textarea.closest('form')
    || textarea.closest('[class*="chat"]')
    || textarea.closest('[class*="input"]')
    || textarea.parentElement.parentElement
    : document.body;
  console.log('[FileUpload:DeepSeek] inputArea tag=' + inputArea.tagName + ' class=' + inputArea.className);

  // Step 2: 在输入区域内查找 file input
  var fileInputs = inputArea.querySelectorAll('input[type="file"]');
  console.log('[FileUpload:DeepSeek] Step2: file inputs in inputArea=' + fileInputs.length);

  // 扩大到全局
  var allFileInputs = document.querySelectorAll('input[type="file"]');
  console.log('[FileUpload:DeepSeek] Step2: all file inputs on page=' + allFileInputs.length);

  for (var i = 0; i < allFileInputs.length; i++) {
    var inp = allFileInputs[i];
    var style = getComputedStyle(inp);
    console.log('[FileUpload:DeepSeek]   Input[' + i + ']: display=' + style.display
      + ' visibility=' + style.visibility
      + ' accept=' + inp.getAttribute('accept')
      + ' parent=' + (inp.parentElement ? inp.parentElement.tagName + '.' + inp.parentElement.className : 'none'));
  }

  // Step 3: 查找上传按钮
  var btnSelectors = [
    'button[class*="upload"]',
    'button[class*="attach"]',
    'button[class*="file"]',
    'label[for*="upload"]',
    'label[for*="file"]',
    'label[for*="attach"]',
    '[class*="upload-btn"]',
    '[class*="attach-btn"]',
    '[class*="Upload"]',
    '[class*="ds-"]'  // DeepSeek 可能用 ds- 前缀
  ];

  for (var s = 0; s < btnSelectors.length; s++) {
    var els = document.querySelectorAll(btnSelectors[s]);
    if (els.length > 0) {
      for (var e = 0; e < els.length; e++) {
        console.log('[FileUpload:DeepSeek] Found: ' + btnSelectors[s]
          + ' text="' + (els[e].textContent || '').substring(0, 50) + '"'
          + ' tag=' + els[e].tagName);
      }
    }
  }

  // Step 4: 尝试注入到 file input
  if (allFileInputs.length > 0) {
    var targetInp = null;
    for (var j = 0; j < allFileInputs.length; j++) {
      var s2 = getComputedStyle(allFileInputs[j]);
      if (s2.display !== 'none' && s2.visibility !== 'hidden' && s2.position !== 'fixed') {
        var rect = allFileInputs[j].getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) {
          targetInp = allFileInputs[j];
          console.log('[FileUpload:DeepSeek] Step4: Using visible input[' + j + ']');
          break;
        }
      }
    }
    if (!targetInp) {
      targetInp = allFileInputs[0];
      console.log('[FileUpload:DeepSeek] Step4: No visible input, using input[0]');
    }

    injectToInput(fileObj, targetInp);
    console.log('[FileUpload:DeepSeek] Step4: Injected into input');

    // 验证注入结果
    setTimeout(function() {
      console.log('[FileUpload:DeepSeek] Post-inject check: files.length=' + targetInp.files.length);
      if (targetInp.files.length > 0) {
        console.log('[FileUpload:DeepSeek] SUCCESS: file in input=' + targetInp.files[0].name);
      } else {
        console.warn('[FileUpload:DeepSeek] FAILED: files.length=0 after injection');
      }
    }, 500);

    return { success: true, message: 'Injected into ' + (targetInp.getAttribute('accept') || 'file-input') };
  }

  // Step 5: 尝试点击上传按钮后注入
  var uploadBtn = document.querySelector(
    'button[class*="upload"], button[class*="attach"], label[for*="upload"], label[for*="file"]'
  );
  if (uploadBtn) {
    console.log('[FileUpload:DeepSeek] Step5: Clicking upload button: ' + uploadBtn.tagName
      + ' text="' + (uploadBtn.textContent || '').substring(0, 30) + '"');
    uploadBtn.click();

    // 等待新 file input 出现
    setTimeout(function() {
      var newInputs = document.querySelectorAll('input[type="file"]');
      console.log('[FileUpload:DeepSeek] Step5: After click, file inputs=' + newInputs.length);
      for (var k = 0; k < newInputs.length; k++) {
        console.log('[FileUpload:DeepSeek] Step5: NewInput[' + k + '] files.length=' + newInputs[k].files.length);
        if (newInputs[k].files.length === 0) {
          injectToInput(fileObj, newInputs[k]);
          console.log('[FileUpload:DeepSeek] Step5: Injected into newInput[' + k + ']');
          break;
        }
      }
    }, 800);

    return { success: true, message: 'Clicked upload button and injected' };
  }

  console.warn('[FileUpload:DeepSeek] ========== FAILED ==========');
  console.warn('[FileUpload:DeepSeek] No file input or upload button found');
  return { success: false, message: 'No upload mechanism found on DeepSeek' };
})()`
}

/**
 * Kimi 文件上传脚本
 * Kimi 使用 contenteditable div（[role="textbox"]）作为输入框
 * 策略：扫描输入区附近 file input → 查找上传按钮点击 → 注入
 */
function getKimiUploadScript(file: UploadFileData): string {
  return `(function() {
  console.log('[FileUpload:Kimi] ========== START ==========');
  console.log('[FileUpload:Kimi] File: name=${file.name} type=${file.mimeType}');
  console.log('[FileUpload:Kimi] URL: ' + window.location.href);

  ${getBase64ToFileCode(file)}
  ${getInjectToInputCode()}

  var fileObj = base64ToFile();
  var injectDone = false;

  function tryInject(inputEl) {
    if (injectDone) return true;
    if (!inputEl || inputEl.tagName !== 'INPUT' || inputEl.type !== 'file') return false;

    injectToInput(fileObj, inputEl);
    setTimeout(function() {
      if (inputEl.files.length > 0) {
        injectDone = true;
        console.log('[FileUpload:Kimi] SUCCESS: file injected=' + inputEl.files[0].name);
      } else {
        console.warn('[FileUpload:Kimi] FAILED: files.length=0');
      }
    }, 300);
    return true;
  }

  // Step 1: 以内容输入框为锚点，在附近容器内查找 file input
  var chatInput = document.querySelector('[role="textbox"][contenteditable="true"]');
  console.log('[FileUpload:Kimi] Step1: chatInput found=' + !!chatInput);

  if (chatInput) {
    var container = chatInput.closest('form, [class*="chat"], [class*="input"], [class*="footer"]')
      || chatInput.parentElement;
    console.log('[FileUpload:Kimi] container: tag=' + container.tagName + ' class=' + (container.className || '').substring(0, 60));

    var nearbyInputs = container.querySelectorAll('input[type="file"]');
    console.log('[FileUpload:Kimi] nearby file inputs=' + nearbyInputs.length);
    if (nearbyInputs.length > 0 && tryInject(nearbyInputs[0])) {
      return { success: true, message: 'Injected via nearby input' };
    }
  }

  // Step 2: 扫描全局 file input
  var allInputs = document.querySelectorAll('input[type="file"]');
  console.log('[FileUpload:Kimi] Step2: all file inputs=' + allInputs.length);
  for (var i = 0; i < allInputs.length; i++) {
    var s = getComputedStyle(allInputs[i]);
    console.log('[FileUpload:Kimi]   Input[' + i + ']: display=' + s.display
      + ' visibility=' + s.visibility + ' accept=' + allInputs[i].getAttribute('accept'));
  }
  if (allInputs.length > 0 && tryInject(allInputs[0])) {
    return { success: true, message: 'Injected via global input' };
  }

  // Step 3: 查找上传按钮并点击
  var btnSelectors = [
    'button[class*="upload"]', 'button[class*="attach"]', 'button[class*="file"]',
    'button[aria-label*="upload" i]', 'button[aria-label*="attach" i]',
    '[class*="upload-btn"]', '[class*="attach-btn"]', '[class*="Upload"]',
    'label[for*="upload"]', 'label[for*="file"]'
  ];
  for (var s = 0; s < btnSelectors.length; s++) {
    var els = document.querySelectorAll(btnSelectors[s]);
    if (els.length > 0) {
      for (var e = 0; e < els.length; e++) {
        console.log('[FileUpload:Kimi] Found btn: ' + btnSelectors[s]
          + ' text="' + (els[e].textContent || '').substring(0, 40) + '"');
      }
    }
  }

  var uploadBtn = document.querySelector(
    'button[class*="upload"], button[class*="attach"], label[for*="upload"], [class*="upload-btn"]'
  );
  if (uploadBtn && !injectDone) {
    console.log('[FileUpload:Kimi] Step3: clicking upload button');
    uploadBtn.click();
    setTimeout(function() {
      var newInputs = document.querySelectorAll('input[type="file"]');
      for (var k = 0; k < newInputs.length; k++) {
        if (newInputs[k].files.length === 0) {
          injectToInput(fileObj, newInputs[k]);
          injectDone = true;
          console.log('[FileUpload:Kimi] Step3: injected after button click');
          break;
        }
      }
    }, 1000);
    return { success: true, message: 'Clicked upload button, waiting for input' };
  }

  // Step 4: 兜底 - drop 事件
  if (!injectDone) {
    var target = chatInput || document.querySelector('[contenteditable="true"]') || document.body;
    try {
      var dt = new DataTransfer();
      dt.items.add(fileObj.file);
      var evt = new DragEvent('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(evt, 'dataTransfer', { value: dt });
      target.dispatchEvent(evt);
      console.log('[FileUpload:Kimi] Step4: drop on', target.tagName);
      return { success: true, message: 'Drop event dispatched' };
    } catch(e) {
      console.warn('[FileUpload:Kimi] Step4: drop failed', e.message);
    }
  }

  console.warn('[FileUpload:Kimi] ========== FAILED ==========');
  return { success: false, message: 'No upload mechanism found on Kimi' };
})()`
}

/**
 * 豆包 文件上传脚本
 * input[type="file"] 存在于 DOM（class=hidden），但可能在脚本执行时尚未渲染
 * 策略：带重试查找 input → 原生setter + React fiber onChange
 *       找不到则走 Radix UI 菜单流程：点击触发按钮 → 弹出菜单 → 点击"上传文件"
 */
function getDouBaoUploadScript(file: UploadFileData): string {
  return `(function() {
  console.log('[FileUpload:DouBao] ========== START ==========');
  console.log('[FileUpload:DouBao] File: name=${file.name} type=${file.mimeType}');

  ${getBase64ToFileCode(file)}

  var fileObj = base64ToFile();
  var injectDone = false;

  function injectFileToInput(inputEl) {
    if (injectDone) return true;
    var className = (inputEl.className || '').substring(0, 60);
    console.log('[FileUpload:DouBao] injectFileToInput: tag=' + inputEl.tagName + ' class=' + className);
    try {
      var desc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files');
      if (!desc || !desc.set) return false;

      var dt = new DataTransfer();
      dt.items.add(fileObj.file);
      desc.set.call(inputEl, dt.files);
      console.log('[FileUpload:DouBao] setter OK, files.length=' + inputEl.files.length);

      // React fiber onChange 优先（避免 dispatchEvent + onChange 触发两次）
      var fiberKey = Object.keys(inputEl).find(function(k) {
        return k.startsWith('__reactFiber') || k.startsWith('__reactInternalInstance');
      });
      var reacted = false;
      if (fiberKey) {
        var fiber = inputEl[fiberKey];
        var depth = 0;
        while (fiber && depth < 20) {
          var props = fiber.memoizedProps || fiber.pendingProps || {};
          if (props.onChange) {
            console.log('[FileUpload:DouBao] Calling React onChange at depth=' + depth);
            try { props.onChange({ target: inputEl, type: 'change' }); } catch(e) {}
            reacted = true;
            break;
          }
          fiber = fiber.return;
          depth++;
        }
      }

      if (!reacted) {
        console.log('[FileUpload:DouBao] No React fiber onChange, using native events');
        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
      }

      setTimeout(function() {
        console.log('[FileUpload:DouBao] post-100ms: files.length=' + inputEl.files.length);
      }, 100);

      injectDone = true;
      return true;
    } catch(e) {
      console.warn('[FileUpload:DouBao] injectFileToInput error:', e.message);
    }
    return false;
  }

  function findFileInput() {
    var inputs = document.querySelectorAll('input[type="file"]');
    if (inputs.length > 0) {
      console.log('[FileUpload:DouBao] findFileInput: found ' + inputs.length + ' input(s)');
      for (var i = 0; i < inputs.length; i++) {
        console.log('[FileUpload:DouBao]   Input[' + i + ']: display=' + getComputedStyle(inputs[i]).display
          + ' class=' + inputs[i].className + ' accept=' + inputs[i].getAttribute('accept'));
      }
      return inputs[0];
    }

    // fallback: 尝试 getElementsByTagName
    var allInputs = document.getElementsByTagName('input');
    for (var j = 0; j < allInputs.length; j++) {
      if (allInputs[j].type === 'file') {
        console.log('[FileUpload:DouBao] findFileInput: found via getElementsByTagName');
        return allInputs[j];
      }
    }
    return null;
  }

  // ======== 策略1: 带重试查找 input，直接注入 ========
  function tryDirectInject(retryCount) {
    if (injectDone) return;
    var inputEl = findFileInput();
    console.log('[FileUpload:DouBao] tryDirectInject attempt ' + retryCount + ': input=' + !!inputEl);
    if (inputEl) {
      if (injectFileToInput(inputEl)) {
        console.log('[FileUpload:DouBao] SUCCESS via direct inject');
        return;
      }
    }
    if (retryCount < 5) {
      setTimeout(function() { tryDirectInject(retryCount + 1); }, 1000);
    } else {
      console.log('[FileUpload:DouBao] Direct inject failed after ' + retryCount + ' retries, trying Radix flow');
      tryRadixFlow();
    }
  }

  // ======== 策略2: Radix UI 菜单流程 ========
  function tryRadixFlow() {
    if (injectDone) return;
    console.log('[FileUpload:DouBao] ===== Radix flow START =====');

    // 劫持 HTMLInputElement.click 避免弹出原生文件对话框
    var originalClick = HTMLInputElement.prototype.click;
    HTMLInputElement.prototype.click = function() {
      if (this.type === 'file') {
        console.log('[FileUpload:DouBao] Intercepted file input click');
        return;
      }
      return originalClick.call(this);
    };

    // MutationObserver 捕获新创建的 file input
    var obs = new MutationObserver(function(mutations) {
      if (injectDone) { obs.disconnect(); return; }
      for (var m = 0; m < mutations.length; m++) {
        var added = mutations[m].addedNodes;
        for (var n = 0; n < added.length; n++) {
          var node = added[n];
          if (node.nodeType !== 1) continue;

          var checkAndInject = function(el) {
            if (injectDone) return true;
            if (el.tagName === 'INPUT' && el.type === 'file') {
              console.log('[FileUpload:DouBao] Observer caught file input!');
              obs.disconnect();
              HTMLInputElement.prototype.click = originalClick;
              setTimeout(function() { injectFileToInput(el); }, 100);
              return true;
            }
            if (el.querySelectorAll) {
              var children = el.querySelectorAll('input[type="file"]');
              if (children.length > 0) {
                console.log('[FileUpload:DouBao] Observer caught file input in subtree!');
                obs.disconnect();
                HTMLInputElement.prototype.click = originalClick;
                setTimeout(function() { injectFileToInput(children[0]); }, 100);
                return true;
              }
            }
            return false;
          };

          if (checkAndInject(node)) return;
        }
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
    console.log('[FileUpload:DouBao] MutationObserver active');

    // 安全恢复
    setTimeout(function() {
      HTMLInputElement.prototype.click = originalClick;
      if (!injectDone) {
        obs.disconnect();
        console.warn('[FileUpload:DouBao] Radix flow timeout');
        tryDropEvent();
      }
    }, 8000);

    // 在 textarea 周边找可能的上传触发按钮
    // 策略：找 textarea 附近的所有小尺寸按钮（24-40px），逐个尝试
    var textarea = document.querySelector('textarea');
    var taRect = textarea ? textarea.getBoundingClientRect() : null;

    var candidateBtns = [];
    var allBtns = document.querySelectorAll('button');
    for (var b = 0; b < allBtns.length; b++) {
      var r = allBtns[b].getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.width <= 44 && r.height <= 44) {
        // 优先 textarea 附近的按钮
        var nearTextarea = taRect ? (r.y >= taRect.y - 20) : false;
        candidateBtns.push({ el: allBtns[b], near: nearTextarea, rect: r });
      }
    }

    // 排序：textarea 附近的优先
    candidateBtns.sort(function(a, b) { return b.near - a.near; });

    console.log('[FileUpload:DouBao] Candidate icon buttons: ' + candidateBtns.length
      + ' (near textarea: ' + candidateBtns.filter(function(c) { return c.near; }).length + ')');

    for (var c = 0; c < candidateBtns.length; c++) {
      var btn = candidateBtns[c].el;
      console.log('[FileUpload:DouBao]   Btn[' + c + ']: '
        + btn.tagName + ' w=' + candidateBtns[c].rect.width + ' h=' + candidateBtns[c].rect.height
        + ' near=' + candidateBtns[c].near
        + ' class=' + (btn.className || '').substring(0, 50)
        + ' svg=' + !!btn.querySelector('svg'));
    }

    // 逐个点击候选按钮，查找 Radix 弹出菜单
    var btnIndex = 0;
    function tryNextBtn() {
      if (injectDone) return;
      if (btnIndex >= candidateBtns.length) {
        console.warn('[FileUpload:DouBao] All candidate buttons tried, no Radix menu found');
        tryDropEvent();
        return;
      }

      var btn = candidateBtns[btnIndex].el;
      console.log('[FileUpload:DouBao] Trying button[' + btnIndex + ']: '
        + btn.tagName + ' class=' + (btn.className || '').substring(0, 50));

      // 点击前记录已有的 Radix popover
      var beforeIds = new Set();
      document.querySelectorAll('[id^="radix-"]').forEach(function(el) { beforeIds.add(el.id); });

      btn.click();
      btnIndex++;

      // 等 Radix 菜单出现
      setTimeout(function() {
        // 查找新出现的 Radix popover（不在 beforeIds 中的）
        var radixEls = document.querySelectorAll('[id^="radix-"]');
        var newPopover = null;
        for (var r = 0; r < radixEls.length; r++) {
          if (!beforeIds.has(radixEls[r].id)) {
            newPopover = radixEls[r];
            console.log('[FileUpload:DouBao] New Radix element appeared: id=' + newPopover.id
              + ' tag=' + newPopover.tagName + ' role=' + (newPopover.getAttribute('role') || 'none'));
            break;
          }
        }

        if (newPopover) {
          // 在弹出菜单中找"上传文件"选项
          var uploadOption = null;
          var allDivs = newPopover.querySelectorAll('div, button, li, [role="menuitem"]');
          for (var d = 0; d < allDivs.length; d++) {
            var text = (allDivs[d].textContent || '').trim();
            if (text === '上传文件' || text === '上传' || text.indexOf('上传') >= 0 && text.length <= 10) {
              uploadOption = allDivs[d];
              console.log('[FileUpload:DouBao] Found upload option: tag=' + uploadOption.tagName
                + ' text="' + text + '" class=' + (uploadOption.className || '').substring(0, 40));
              break;
            }
          }

          if (uploadOption) {
            console.log('[FileUpload:DouBao] Clicking upload option...');
            uploadOption.click();
            return; // MutationObserver will catch the file input
          }

          // 没找到"上传文件"，打印菜单内容帮你调试
          console.log('[FileUpload:DouBao] Radix popover text content (first 300 chars): '
            + (newPopover.textContent || '').substring(0, 300));
        }

        // 这个按钮没触发上传菜单，尝试下一个
        setTimeout(function() { tryNextBtn(); }, 200);
      }, 500);
    }

    // 开始尝试
    setTimeout(function() { tryNextBtn(); }, 300);
  }

  function tryDropEvent() {
    if (injectDone) return;
    console.log('[FileUpload:DouBao] Trying drop event as last resort');
    var zones = document.querySelectorAll('[class*="chat" i], [class*="main" i], [class*="content" i], body');
    for (var z = 0; z < zones.length; z++) {
      try {
        var dt = new DataTransfer();
        dt.items.add(fileObj.file);
        var dropEvt = new DragEvent('drop', { bubbles: true, cancelable: true });
        Object.defineProperty(dropEvt, 'dataTransfer', { value: dt });
        zones[z].dispatchEvent(dropEvt);
        var zoneClass = zones[z].className ? '.' + zones[z].className.substring(0, 40) : '';
        console.log('[FileUpload:DouBao] Drop on ' + zones[z].tagName + zoneClass);
      } catch(e2) {}
    }
  }

  // 启动：先尝试直接注入（最多重试5次，每次间隔1秒）
  tryDirectInject(0);

  console.log('[FileUpload:DouBao] ========== SETUP DONE (async) ==========');
  return { success: true, message: 'Doubao retry+radix strategy' };
})()`
}

/**
 * 元宝 文件上传脚本
 */
function getYuanBaoUploadScript(file: UploadFileData): string {
  return `(function() {
  console.log('[FileUpload:YuanBao] ========== START ==========');
  console.log('[FileUpload:YuanBao] File: name=${file.name} type=${file.mimeType}');
  console.log('[FileUpload:YuanBao] URL: ' + window.location.href);

  ${getBase64ToFileCode(file)}

  var fileObj = base64ToFile();

  /**
   * 在指定元素上触发拖拽事件
   * @param {Element} target - 目标元素
   * @param {File} file - 要上传的文件
   */
  function dispatchDragDrop(target, file) {
    var dt = new DataTransfer();
    dt.items.add(file);

    // 触发 dragenter 和 dragover 事件
    ['dragenter', 'dragover'].forEach(function(evtName) {
      var evt = new DragEvent(evtName, {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt
      });
      target.dispatchEvent(evt);
    });

    // 触发 drop 事件
    var dropEvt = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dt
    });
    target.dispatchEvent(dropEvt);
    console.log('[FileUpload:YuanBao] drag/drop events dispatched on', target.className?.substring(0, 50) || target.tagName);
  }

  // 策略: 在 ql-editor 上模拟拖拽上传
  // 经测试，元宝支持通过拖拽事件直接上传文件，无需打开系统文件选择器
  var editor = document.querySelector('.ql-editor');
  console.log('[FileUpload:YuanBao] ql-editor found=' + !!editor);

  if (editor) {
    try {
      dispatchDragDrop(editor, fileObj.file);
      console.log('[FileUpload:YuanBao] drag/drop upload completed');
      return { success: true, message: 'Drag/drop upload dispatched on ql-editor' };
    } catch(e) {
      console.warn('[FileUpload:YuanBao] drag/drop failed:', e.message);
    }
  }

  // 兜底: 在 body 上触发 drop 事件
  console.log('[FileUpload:YuanBao] trying drop on body');
  try {
    dispatchDragDrop(document.body, fileObj.file);
    console.log('[FileUpload:YuanBao] drop event dispatched on body');
    return { success: true, message: 'Drop event dispatched on body' };
  } catch(e) {
    console.warn('[FileUpload:YuanBao] body drop failed:', e.message);
  }

  console.warn('[FileUpload:YuanBao] ========== FAILED ==========');
  return { success: false, message: 'Drag/drop upload failed' };
})()`
}

/**
 * GLM 文件上传脚本
 * GLM 基于 React，使用 textarea 作为聊天输入，文件上传按钮在输入区附近
 * 策略：扫描 textarea 附近 DOM → 查找 file input → 查找上传按钮点击 → 注入
 */
function getGLMUploadScript(file: UploadFileData): string {
  return `(function() {
  console.log('[FileUpload:GLM] ========== START ==========');
  console.log('[FileUpload:GLM] File: name=${file.name} type=${file.mimeType}');
  console.log('[FileUpload:GLM] URL: ' + window.location.href);

  ${getBase64ToFileCode(file)}
  ${getInjectToInputCode()}

  var fileObj = base64ToFile();

  // Step 1: 扫描 textarea 附近的 DOM
  var textarea = document.querySelector('textarea');
  console.log('[FileUpload:GLM] Step1: textarea found=' + !!textarea);

  var inputArea = textarea ? textarea.closest('form')
    || textarea.closest('[class*="chat"]')
    || textarea.closest('[class*="input"]')
    || textarea.parentElement.parentElement
    : document.body;
  console.log('[FileUpload:GLM] inputArea tag=' + inputArea.tagName + ' class=' + inputArea.className);

  // Step 2: 在输入区域内查找 file input
  var fileInputs = inputArea.querySelectorAll('input[type="file"]');
  console.log('[FileUpload:GLM] Step2: file inputs in inputArea=' + fileInputs.length);

  // 扩大到全局
  var allFileInputs = document.querySelectorAll('input[type="file"]');
  console.log('[FileUpload:GLM] Step2: all file inputs on page=' + allFileInputs.length);

  for (var i = 0; i < allFileInputs.length; i++) {
    var inp = allFileInputs[i];
    var style = getComputedStyle(inp);
    console.log('[FileUpload:GLM]   Input[' + i + ']: display=' + style.display
      + ' visibility=' + style.visibility
      + ' accept=' + inp.getAttribute('accept')
      + ' parent=' + (inp.parentElement ? inp.parentElement.tagName + '.' + inp.parentElement.className : 'none'));
  }

  // Step 3: 查找上传按钮
  var btnSelectors = [
    'button[class*="upload"]',
    'button[class*="attach"]',
    'button[class*="file"]',
    'label[for*="upload"]',
    'label[for*="file"]',
    'label[for*="attach"]',
    '[class*="upload-btn"]',
    '[class*="attach-btn"]',
    '[class*="Upload"]',
    '[class*="glm-"]'  // GLM 可能用 glm- 前缀
  ];

  for (var s = 0; s < btnSelectors.length; s++) {
    var els = document.querySelectorAll(btnSelectors[s]);
    if (els.length > 0) {
      for (var e = 0; e < els.length; e++) {
        console.log('[FileUpload:GLM] Found: ' + btnSelectors[s]
          + ' text="' + (els[e].textContent || '').substring(0, 50) + '"'
          + ' tag=' + els[e].tagName);
      }
    }
  }

  // Step 4: 尝试注入到 file input
  if (allFileInputs.length > 0) {
    var targetInp = null;
    for (var j = 0; j < allFileInputs.length; j++) {
      var s2 = getComputedStyle(allFileInputs[j]);
      if (s2.display !== 'none' && s2.visibility !== 'hidden' && s2.position !== 'fixed') {
        var rect = allFileInputs[j].getBoundingClientRect();
        if (rect.width > 0 || rect.height > 0) {
          targetInp = allFileInputs[j];
          console.log('[FileUpload:GLM] Step4: Using visible input[' + j + ']');
          break;
        }
      }
    }
    if (!targetInp) {
      targetInp = allFileInputs[0];
      console.log('[FileUpload:GLM] Step4: No visible input, using input[0]');
    }

    injectToInput(fileObj, targetInp);
    console.log('[FileUpload:GLM] Step4: Injected into input');

    // 验证注入结果
    setTimeout(function() {
      console.log('[FileUpload:GLM] Post-inject check: files.length=' + targetInp.files.length);
      if (targetInp.files.length > 0) {
        console.log('[FileUpload:GLM] SUCCESS: file in input=' + targetInp.files[0].name);
      } else {
        console.warn('[FileUpload:GLM] FAILED: files.length=0 after injection');
      }
    }, 500);

    return { success: true, message: 'Injected into ' + (targetInp.getAttribute('accept') || 'file-input') };
  }

  // Step 5: 尝试点击上传按钮后注入
  var uploadBtn = document.querySelector(
    'button[class*="upload"], button[class*="attach"], label[for*="upload"], label[for*="file"]'
  );
  if (uploadBtn) {
    console.log('[FileUpload:GLM] Step5: Clicking upload button: ' + uploadBtn.tagName
      + ' text="' + (uploadBtn.textContent || '').substring(0, 30) + '"');
    uploadBtn.click();

    // 等待新 file input 出现
    setTimeout(function() {
      var newInputs = document.querySelectorAll('input[type="file"]');
      console.log('[FileUpload:GLM] Step5: After click, file inputs=' + newInputs.length);
      for (var k = 0; k < newInputs.length; k++) {
        console.log('[FileUpload:GLM] Step5: NewInput[' + k + '] files.length=' + newInputs[k].files.length);
        if (newInputs[k].files.length === 0) {
          injectToInput(fileObj, newInputs[k]);
          console.log('[FileUpload:GLM] Step5: Injected into newInput[' + k + ']');
          break;
        }
      }
    }, 800);

    return { success: true, message: 'Clicked upload button and injected' };
  }

  console.warn('[FileUpload:GLM] ========== FAILED ==========');
  console.warn('[FileUpload:GLM] No file input or upload button found');
  return { success: false, message: 'No upload mechanism found on GLM' };
})()`
}

/**
 * Mimo 文件上传脚本
 * Mimo 基于 textarea（与 DeepSeek 类似），文件上传按钮在输入区附近
 * 策略：扫描 textarea 附近 file input → 查找上传按钮点击 → 注入
 */
function getMimoUploadScript(file: UploadFileData): string {
  return `(function() {
  console.log('[FileUpload:Mimo] ========== START ==========');
  console.log('[FileUpload:Mimo] File: name=${file.name} type=${file.mimeType}');
  console.log('[FileUpload:Mimo] URL: ' + window.location.href);

  ${getBase64ToFileCode(file)}
  ${getInjectToInputCode()}

  var fileObj = base64ToFile();
  var injectDone = false;

  function isInjected() {
    return injectDone;
  }

  function tryInject(inputEl) {
    if (injectDone) return true;
    if (!inputEl || inputEl.tagName !== 'INPUT' || inputEl.type !== 'file') return false;

    var style = getComputedStyle(inputEl);
    console.log('[FileUpload:Mimo] tryInject: class=' + (inputEl.className || '').substring(0, 50)
      + ' display=' + style.display + ' visibility=' + style.visibility);

    injectToInput(fileObj, inputEl);

    setTimeout(function() {
      console.log('[FileUpload:Mimo] Post-inject: files.length=' + inputEl.files.length);
      if (inputEl.files.length > 0) {
        injectDone = true;
        console.log('[FileUpload:Mimo] SUCCESS: file injected=' + inputEl.files[0].name);
      } else {
        console.warn('[FileUpload:Mimo] FAILED: files.length=0');
      }
    }, 300);

    return true;
  }

  // Step 1: 扫描 textarea 附近的 DOM 找 file input
  var textarea = document.querySelector('textarea');
  console.log('[FileUpload:Mimo] Step1: textarea found=' + !!textarea);

  if (textarea) {
    var inputArea = textarea.closest('form')
      || textarea.closest('[class*="chat"]')
      || textarea.closest('[class*="input"]')
      || textarea.closest('[class*="footer"]')
      || textarea.parentElement;
    console.log('[FileUpload:Mimo] inputArea: tag=' + (inputArea ? inputArea.tagName : 'null')
      + ' class=' + (inputArea ? (inputArea.className || '').substring(0, 60) : 'null'));

    var nearbyInputs = inputArea.querySelectorAll('input[type="file"]');
    console.log('[FileUpload:Mimo] nearby file inputs=' + nearbyInputs.length);
    if (nearbyInputs.length > 0) {
      if (tryInject(nearbyInputs[0])) {
        console.log('[FileUpload:Mimo] Step1: injected via nearby input');
        return { success: true, message: 'Injected via nearby file input' };
      }
    }
  }

  // Step 2: 查找页面上所有 file input
  var allFileInputs = document.querySelectorAll('input[type="file"]');
  console.log('[FileUpload:Mimo] Step2: all file inputs=' + allFileInputs.length);
  for (var i = 0; i < allFileInputs.length; i++) {
    var inp = allFileInputs[i];
    var s = getComputedStyle(inp);
    console.log('[FileUpload:Mimo]   Input[' + i + ']: display=' + s.display
      + ' visibility=' + s.visibility + ' accept=' + inp.getAttribute('accept')
      + ' parent=' + (inp.parentElement ? inp.parentElement.tagName : 'none'));
  }

  if (allFileInputs.length > 0 && tryInject(allFileInputs[0])) {
    console.log('[FileUpload:Mimo] Step2: injected via global input');
    return { success: true, message: 'Injected via global file input' };
  }

  // Step 3: 查找上传/附件按钮并点击，等待 file input 出现
  var btnSelectors = [
    'button[class*="upload"]',
    'button[class*="attach"]',
    'button[class*="file"]',
    'button[aria-label*="upload" i]',
    'button[aria-label*="attach" i]',
    'button[title*="upload" i]',
    'label[for*="upload"]',
    'label[for*="file"]',
    '[class*="upload-btn"]',
    '[class*="attach-btn"]',
    '[class*="Upload"]'
  ];

  for (var s = 0; s < btnSelectors.length; s++) {
    var els = document.querySelectorAll(btnSelectors[s]);
    if (els.length > 0) {
      for (var e = 0; e < els.length; e++) {
        console.log('[FileUpload:Mimo] Found btn: ' + btnSelectors[s]
          + ' tag=' + els[e].tagName + ' text="' + (els[e].textContent || '').substring(0, 40) + '"');
      }
    }
  }

  var uploadBtn = document.querySelector(
    'button[class*="upload"], button[class*="attach"], label[for*="upload"], label[for*="file"]'
  );
  if (uploadBtn && !isInjected()) {
    console.log('[FileUpload:Mimo] Step3: Clicking upload button: ' + uploadBtn.tagName);
    uploadBtn.click();

    setTimeout(function() {
      var newInputs = document.querySelectorAll('input[type="file"]');
      console.log('[FileUpload:Mimo] Step3: after click, file inputs=' + newInputs.length);
      for (var k = 0; k < newInputs.length; k++) {
        if (newInputs[k].files.length === 0) {
          injectToInput(fileObj, newInputs[k]);
          injectDone = true;
          console.log('[FileUpload:Mimo] Step3: injected after button click');
          break;
        }
      }
    }, 1000);

    return { success: true, message: 'Clicked upload button, waiting for input' };
  }

  // Step 4: 兜底 - 尝试在 textarea 上触发 drop 事件
  if (!isInjected()) {
    console.log('[FileUpload:Mimo] Step4: trying drop on textarea');
    var dropTarget = textarea || document.querySelector('[contenteditable="true"]') || document.body;
    try {
      var dt = new DataTransfer();
      dt.items.add(fileObj.file);
      var dropEvt = new DragEvent('drop', { bubbles: true, cancelable: true });
      Object.defineProperty(dropEvt, 'dataTransfer', { value: dt });
      dropTarget.dispatchEvent(dropEvt);
      console.log('[FileUpload:Mimo] Step4: drop event dispatched on', dropTarget.tagName);
      return { success: true, message: 'Drop event dispatched' };
    } catch(e) {
      console.warn('[FileUpload:Mimo] Step4: drop failed', e.message);
    }
  }

  console.warn('[FileUpload:Mimo] ========== FAILED ==========');
  return { success: false, message: 'No upload mechanism found on Mimo' };
})()`
}

/**
 * 通用文件上传脚本（用于未知或不支持的网站）
 * 优先使用拖拽上传策略，因为大多数网站都支持拖拽上传
 * 包含详细的诊断日志，帮助排查问题
 */
function getGenericUploadScript(file: UploadFileData): string {
  return `(function() {
  console.log('[FileUpload:Generic] ========== START ==========');
  console.log('[FileUpload:Generic] File: name=${file.name} type=${file.mimeType}');
  console.log('[FileUpload:Generic] URL: ' + window.location.href);
  console.log('[FileUpload:Generic] DOM readyState: ' + document.readyState);

  ${getBase64ToFileCode(file)}
  ${getInjectToInputCode()}

  var fileObj = base64ToFile();

  /**
   * 在指定元素上触发拖拽事件
   * @param {Element} target - 目标元素
   * @param {File} file - 要上传的文件
   */
  function dispatchDragDrop(target, file) {
    var dt = new DataTransfer();
    dt.items.add(file);

    ['dragenter', 'dragover'].forEach(function(evtName) {
      target.dispatchEvent(new DragEvent(evtName, {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt
      }));
    });

    target.dispatchEvent(new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dt
    }));
  }

  // Step 1: 优先尝试拖拽上传到输入区域
  // 大多数网站（包括元宝、DeepSeek等）都支持拖拽上传
  console.log('[FileUpload:Generic] Step1: Trying drag-and-drop upload');

  var dropTargets = [
    // 富文本编辑器
    '.ql-editor',
    '[contenteditable="true"]',
    '[role="textbox"]',
    // 文本输入区
    'textarea',
    // 聊天输入容器
    '[class*="chat-input"]',
    '[class*="input-area"]',
    '[class*="message-input"]',
    // 表单
    'form',
    // 主内容区
    'main',
    // body 兜底
    'body'
  ];

  for (var i = 0; i < dropTargets.length; i++) {
    var target = document.querySelector(dropTargets[i]);
    if (target) {
      console.log('[FileUpload:Generic] Step1: Dropping on ' + dropTargets[i]);
      try {
        dispatchDragDrop(target, fileObj.file);
        console.log('[FileUpload:Generic] Step1: Drag-drop dispatched on ' + dropTargets[i]);
        return { success: true, message: 'Drag-drop dispatched on ' + dropTargets[i] };
      } catch(e) {
        console.warn('[FileUpload:Generic] Step1: Drag-drop failed on ' + dropTargets[i] + ':', e.message);
      }
    }
  }

  // Step 2: 扫描页面上所有 file input
  console.log('[FileUpload:Generic] Step2: Trying file input injection');
  var allInputs = document.querySelectorAll('input[type="file"]');
  console.log('[FileUpload:Generic] Step2: Found ' + allInputs.length + ' input[type=file] elements');

  for (var j = 0; j < allInputs.length; j++) {
    var inp = allInputs[j];
    var style = getComputedStyle(inp);
    var rect = inp.getBoundingClientRect();
    console.log('[FileUpload:Generic]   Input[' + j + ']:' +
      ' display=' + style.display +
      ' visibility=' + style.visibility +
      ' position=' + style.position +
      ' rect=' + JSON.stringify({x: rect.x, y: rect.y, w: rect.width, h: rect.height}) +
      ' offsetParent=' + (inp.offsetParent ? inp.offsetParent.tagName : 'null') +
      ' accept=' + inp.getAttribute('accept') +
      ' multiple=' + inp.multiple);
  }

  // Step 3: 尝试注入到 file input
  if (allInputs.length > 0) {
    var targetInput = null;
    for (var k = 0; k < allInputs.length; k++) {
      var s2 = getComputedStyle(allInputs[k]);
      if (s2.display !== 'none' && s2.visibility !== 'hidden') {
        targetInput = allInputs[k];
        console.log('[FileUpload:Generic] Step3: Using visible input[' + k + ']');
        break;
      }
    }
    if (!targetInput) {
      targetInput = allInputs[0];
      console.log('[FileUpload:Generic] Step3: No visible input found, using input[0]');
    }
    injectToInput(fileObj, targetInput);
    console.log('[FileUpload:Generic] Step3: Injected file successfully');

    // 检查注入后状态
    setTimeout(function() {
      console.log('[FileUpload:Generic] Step3: Post-injection check');
      console.log('[FileUpload:Generic]   input.files.length=' + targetInput.files.length);
      console.log('[FileUpload:Generic]   input.files[0]=' + (targetInput.files[0] ? targetInput.files[0].name : 'null'));
      if (targetInput.files.length > 0) {
        return { success: true, message: 'File injected: ' + targetInput.files[0].name };
      }
      return { success: false, message: 'Injection seemed to fail: files.length=0' };
    }, 500);

    return 'pending';
  }

  // Step 4: 扫描上传按钮
  console.log('[FileUpload:Generic] Step4: Scanning upload buttons');
  var uploadSelectors = [
    'button[aria-label*="upload" i]',
    'button[aria-label*="attach" i]',
    'button[aria-label*="Add files" i]',
    'button[title*="upload" i]',
    'button[title*="attach" i]',
    '[data-testid="file-upload-button"]',
    '[class*="upload-btn"]',
    '[class*="attach-btn"]',
    '[class*="Upload"]',
    '[class*="upload"]'
  ];

  var buttonsFound = [];
  for (var s = 0; s < uploadSelectors.length; s++) {
    var els = document.querySelectorAll(uploadSelectors[s]);
    if (els.length > 0) {
      buttonsFound.push({ selector: uploadSelectors[s], count: els.length });
    }
  }
  console.log('[FileUpload:Generic] Step4: upload-related elements found:', JSON.stringify(buttonsFound));

  console.warn('[FileUpload:Generic] ========== FAILED ==========');
  return { success: false, message: 'No upload mechanism found' };
})()`
}

/**
 * 获取所有支持文件上传的提供商列表
 */
export function getFileUploadSupportedProviders(): string[] {
  return [
    'chatgpt', 'gemini', 'deepseek', 'kimi', 'doubao',
    'qwen', 'grok', 'yuanbao', 'copilot', 'glm',
    'miromind', 'mimo', 'minimax',
    'stepfun', 'qwen-studio', 'gemini-studio'
  ]
}
