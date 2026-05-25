/**
 * 文件上传脚本工具类
 * 提供不同AI网站的文件上传注入脚本
 *
 * @author huquanzhi
 * @since 2026-05-23 10:30
 * @version 1.0
 */

import { resolveScript } from './ScriptResolver'

export interface UploadFileData {
  name: string
  mimeType: string
  base64: string
}

/**
 * 获取文件上传注入脚本
 * @param providerId AI提供商ID
 * @param file 文件数据
 * @returns 注入到webview中执行的JavaScript脚本
 */
export function getFileUploadScript(providerId: string, file: UploadFileData): string {
  const scripts: Record<string, string> = {
    chatgpt: getChatGPTUploadScript(file),
    gemini: getGeminiUploadScript(file),
    deepseek: getDeepSeekUploadScript(file),
    kimi: getKimiUploadScript(file),
    doubao: getDouBaoUploadScript(file),
    qwen: getQwenUploadScript(file),
    grok: getGrokUploadScript(file),
    yuanbao: getYuanBaoUploadScript(file),
    copilot: getCopilotUploadScript(file),
    glm: getGLMUploadScript(file),
    miromind: getMiromindUploadScript(file),
    mimo: getMimoUploadScript(file),
    minimax: getMinimaxUploadScript(file)
  }

  const defaultScript = scripts[providerId] || getGenericUploadScript(file)
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
 */
function getGeminiUploadScript(file: UploadFileData): string {
  return getGenericUploadScript(file)
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
 */
function getKimiUploadScript(file: UploadFileData): string {
  return getGenericUploadScript(file)
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
    console.log('[FileUpload:DouBao] injectFileToInput: tag=' + inputEl.tagName + ' class=' + (inputEl.className || '').substring(0, 60));
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
        console.log('[FileUpload:DouBao] Drop on ' + zones[z].tagName + (zones[z].className ? '.' + zones[z].className.substring(0, 40) : ''));
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
 * 通义千问 文件上传脚本
 */
function getQwenUploadScript(file: UploadFileData): string {
  return getGenericUploadScript(file)
}

/**
 * Grok 文件上传脚本
 */
function getGrokUploadScript(file: UploadFileData): string {
  return getGenericUploadScript(file)
}

/**
 * 元宝 文件上传脚本
 */
function getYuanBaoUploadScript(file: UploadFileData): string {
  return getGenericUploadScript(file)
}

/**
 * Copilot 文件上传脚本
 */
function getCopilotUploadScript(file: UploadFileData): string {
  return getGenericUploadScript(file)
}

/**
 * GLM 文件上传脚本
 */
function getGLMUploadScript(file: UploadFileData): string {
  return getGenericUploadScript(file)
}

/**
 * Miromind 文件上传脚本
 */
function getMiromindUploadScript(file: UploadFileData): string {
  return getGenericUploadScript(file)
}

/**
 * Mimo 文件上传脚本
 */
function getMimoUploadScript(file: UploadFileData): string {
  return getGenericUploadScript(file)
}

/**
 * Minimax 文件上传脚本
 */
function getMinimaxUploadScript(file: UploadFileData): string {
  return getGenericUploadScript(file)
}

/**
 * 通用文件上传脚本（用于未知或不支持的网站）
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

  // Step 1: 扫描页面上所有 file input
  var allInputs = document.querySelectorAll('input[type="file"]');
  console.log('[FileUpload:Generic] Step1: Found ' + allInputs.length + ' input[type=file] elements');

  for (var i = 0; i < allInputs.length; i++) {
    var inp = allInputs[i];
    var style = getComputedStyle(inp);
    var rect = inp.getBoundingClientRect();
    console.log('[FileUpload:Generic]   Input[' + i + ']:' +
      ' display=' + style.display +
      ' visibility=' + style.visibility +
      ' position=' + style.position +
      ' rect=' + JSON.stringify({x: rect.x, y: rect.y, w: rect.width, h: rect.height}) +
      ' offsetParent=' + (inp.offsetParent ? inp.offsetParent.tagName : 'null') +
      ' accept=' + inp.getAttribute('accept') +
      ' multiple=' + inp.multiple);
  }

  // Step 2: 扫描上传按钮
  var uploadSelectors = [
    'button[aria-label*="upload" i]',
    'button[aria-label*="attach" i]',
    'button[aria-label*="Add files" i]',
    'button[title*="upload" i]',
    'button[title*="attach" i]',
    'input[type="file"]',
    '[data-testid="file-upload-button"]',
    '[class*="upload-btn"]',
    '[class*="attach-btn"]',
    '[class*="Upload"]',
    '[class*="upload"]',
    'input[id*="upload"]',
    'input[id*="file"]',
    'label[for*="upload"]',
    'label[for*="file"]'
  ];

  var buttonsFound = [];
  for (var s = 0; s < uploadSelectors.length; s++) {
    var els = document.querySelectorAll(uploadSelectors[s]);
    if (els.length > 0) {
      buttonsFound.push({ selector: uploadSelectors[s], count: els.length });
    }
  }
  console.log('[FileUpload:Generic] Step2: upload-related elements found:', JSON.stringify(buttonsFound));

  // Step 3: 尝试注入到 file input
  if (allInputs.length > 0) {
    var target = null;
    for (var j = 0; j < allInputs.length; j++) {
      var s2 = getComputedStyle(allInputs[j]);
      if (s2.display !== 'none' && s2.visibility !== 'hidden') {
        target = allInputs[j];
        console.log('[FileUpload:Generic] Step3: Using visible input[' + j + ']');
        break;
      }
    }
    if (!target) {
      target = allInputs[0];
      console.log('[FileUpload:Generic] Step3: No visible input found, using input[0]');
    }
    injectToInput(fileObj, target);
    console.log('[FileUpload:Generic] Step3: Injected file successfully');

    // Step 4: 检查注入后状态
    setTimeout(function() {
      console.log('[FileUpload:Generic] Step4: Post-injection check');
      console.log('[FileUpload:Generic]   input.files.length=' + target.files.length);
      console.log('[FileUpload:Generic]   input.files[0]=' + (target.files[0] ? target.files[0].name : 'null'));
      if (target.files.length > 0) {
        return { success: true, message: 'File injected: ' + target.files[0].name };
      }
      return { success: false, message: 'Injection seemed to fail: files.length=0' };
    }, 500);

    return 'pending';
  }

  // Step 5: 没有 file input，尝试 drop zone
  console.log('[FileUpload:Generic] Step5: No file inputs, trying drop zone approach');
  var dropZoneSelectors = [
    '[data-testid="file-upload-area"]',
    '[class*="upload-area"]',
    '[class*="dropzone"]',
    '[class*="drop-zone"]',
    '[class*="drag-drop"]',
    '[class*="file-drop"]'
  ];

  for (var d = 0; d < dropZoneSelectors.length; d++) {
    var zone = document.querySelector(dropZoneSelectors[d]);
    if (zone) {
      console.log('[FileUpload:Generic] Found drop zone:', dropZoneSelectors[d]);
      var dt = new DataTransfer();
      dt.items.add(fileObj.file);
      ['dragenter', 'dragover'].forEach(function(evt) {
        zone.dispatchEvent(new DragEvent(evt, { bubbles: true, dataTransfer: dt }));
      });
      var dropEvent = new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt });
      zone.dispatchEvent(dropEvent);
      console.log('[FileUpload:Generic] Dispatched drag-drop events on zone');
      return { success: true, message: 'File dropped on zone' };
    }
  }

  console.warn('[FileUpload:Generic] Step6: FAILED - No upload mechanism found');
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
    'miromind', 'mimo', 'minimax'
  ]
}
