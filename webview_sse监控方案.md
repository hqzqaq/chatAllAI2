在Electron中，监听 `webview` 内部网页的 SSE（Server-Sent Events）请求状态（特别是“是否正在接收消息”），**最有效且最推荐的方法是使用 `preload` 脚本进行注入拦截**。

这是因为 SSE 在网络层（Network Layer）看来只是一个长连接 HTTP 请求，Electron 的主进程网络API（如 `webRequest`）只能监听到请求的“开始”和“结束”，无法感知连接建立后内部每一个数据包（Chunk/Message）的传输情况。

因此，必须在渲染进程（网页内部）通过劫持 `EventSource` 或 `fetch` API 来获取实时状态。

以下是具体实现方案：

### 核心思路
1.  **Preload 脚本注入**：在 `webview` 加载前注入一段 JS。
2.  **劫持 API**：重写网页原本的 `window.EventSource`（标准SSE）或 `window.fetch`（流式请求）。
3.  **消息回传**：利用 `ipcRenderer.sendToHost` 将状态实时发送给 `<webview>` 的宿主页面。

---

### 步骤 1: 编写 preload.js
创建一个名为 `preload.js` 的文件，用于劫持 `EventSource`。这是 SSE 的标准 API。

```javascript
// preload.js
const { ipcRenderer } = require('electron');

// 保存原始的 EventSource 构造函数
const OriginalEventSource = window.EventSource;

// 重写 EventSource
window.EventSource = class extends OriginalEventSource {
  constructor(url, options) {
    super(url, options);
    
    // 向宿主发送：开始连接 SSE
    ipcRenderer.sendToHost('sse-status', {
      type: 'connect',
      url: url,
      status: 'connecting'
    });

    // 监听连接成功
    this.addEventListener('open', (event) => {
      ipcRenderer.sendToHost('sse-status', {
        type: 'open',
        url: url,
        status: 'connected'
      });
    });

    // 监听收到消息
    this.addEventListener('message', (event) => {
      // 这里可以获取具体消息内容 event.data
      // 如果只关心“是否在接收”，可以只发一个心跳
      ipcRenderer.sendToHost('sse-status', {
        type: 'message',
        url: url,
        status: 'receiving',
        timestamp: Date.now(),
        dataLength: event.data.length // 可选：发送数据长度供参考
      });
    });

    // 监听错误/断开
    this.addEventListener('error', (event) => {
      ipcRenderer.sendToHost('sse-status', {
        type: 'error',
        url: url,
        status: 'error/closed'
      });
    });
  }
};

// 如果网页使用的是 fetch 流式传输 (如 OpenAI 风格的流)，则需要劫持 fetch
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  
  // 检查是否是流式响应 (SSE 通常是 text/event-stream，或者普通的流)
  // 注意：这一步可能会稍微影响性能，需按需开启
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/event-stream')) {
    
    // 克隆 response 以便读取流，不影响网页原有逻辑
    const clone = response.clone();
    const reader = clone.body.getReader();
    const url = args[0] instanceof Request ? args[0].url : args[0];

    ipcRenderer.sendToHost('sse-status', { type: 'fetch-stream-start', url });

    // 异步读取流监控状态
    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            ipcRenderer.sendToHost('sse-status', { type: 'fetch-stream-end', url });
            break;
          }
          // 收到数据块
          ipcRenderer.sendToHost('sse-status', { 
            type: 'message', 
            url, 
            status: 'receiving-chunk',
            size: value ? value.length : 0
          });
        }
      } catch (err) {
        // 流出错
      }
    })();
  }

  return response;
};
```

### 步骤 2: 在 Electron 宿主页面监听
在你的主界面（包含 `<webview>` 标签的 HTML/JS）中，监听 `ipc-message` 事件。

**HTML 代码:**
```html
<!-- 记得引入 preload 路径 -->
<webview 
  id="my-webview" 
  src="https://example.com" 
  preload="./path/to/preload.js"
></webview>
```

**渲染进程 JS (Renderer.js):**
```javascript
const webview = document.getElementById('my-webview');

// 监听来自 preload 的消息
webview.addEventListener('ipc-message', (event) => {
  if (event.channel === 'sse-status') {
    const info = event.args[0];
    console.log('SSE 状态更新:', info);

    // 根据 info.type 判断状态
    switch (info.type) {
      case 'connect':
        console.log(`正在连接 SSE: ${info.url}`);
        break;
      case 'open':
        console.log(`SSE 连接成功`);
        break;
      case 'message':
        console.log(`正在接收消息... 上次时间: ${new Date(info.timestamp).toLocaleTimeString()}`);
        // 在这里更新你的 UI 状态，比如显示“对方正在输入...”或“接收中”
        updateReceivingIndicator(true);
        
        // 设置一个防抖动，如果超过例如 2秒 没收到消息，认为暂停了
        resetIdleTimer();
        break;
      case 'error':
        console.log(`SSE 连接断开或出错`);
        updateReceivingIndicator(false);
        break;
    }
  }
});

// 简单的闲置检测逻辑
let idleTimer;
function resetIdleTimer() {
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    console.log('SSE 暂时没有新消息');
    updateReceivingIndicator(false);
  }, 2000); // 2秒无消息视为停止接收
}

function updateReceivingIndicator(isReceiving) {
  // 更新界面 UI
  const statusEl = document.getElementById('status');
  if(statusEl) statusEl.innerText = isReceiving ? "正在接收..." : "空闲";
}
```

### 方案总结

| 方法 | 优点 | 缺点 | 适用场景 |
| :--- | :--- | :--- | :--- |
| **网络请求拦截** (`onBeforeRequest`) | 无需注入代码，性能开销极小 | **无法**监听连接建立后的具体消息收发，只能知道连接存在 | 仅需知道是否有 SSE 连接，不关心内容 |
| **Preload 注入 (推荐)** | **能够精确感知**每一条消息的接收时间、内容大小、连接状态 | 需要维护注入脚本，且如果网页使用非标准流（如自定义 XHR 流）需要额外适配 | 需要实时监控“正在接收”、“打字中”等状态 |

### 注意事项
1.  **Fetch 场景**：现在很多 AI 网站（如 ChatGPT）使用的是 `fetch` 配合 `ReadableStream` 而不是标准的 `EventSource`。我在代码中包含了 `fetch` 的劫持逻辑，这能覆盖 90% 以上的现代流式应用。
2.  **安全策略**：确保 `<webview>` 的 `nodeintegration` 是关闭的（默认即关闭），使用 `preload` 是安全的通信方式。
3.  **性能**：在 `fetch` 劫持中使用了 `response.clone()`，这在极大数据流下可能会增加内存开销。如果是普通文本流（如聊天机器人），影响通过忽略不计。