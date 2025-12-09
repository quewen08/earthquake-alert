const WebSocket = require("ws");
const config = require("../config/config");
const { logMessage } = require("../utils/logger");
const { parseMessageData } = require("../parsers/messageParser");
const { handleMessage } = require("../handlers/messageHandler");

// WebSocket连接服务
class WebSocketService {
  constructor() {
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 5000;
  }

  // 初始化WebSocket连接
  init() {
    this.connect();
  }

  // 建立WebSocket连接
  connect() {
    try {
      logMessage(`正在连接到WebSocket服务器: ${config.websocket_url}`);

      this.ws = new WebSocket(config.websocket_url);

      // 连接打开事件
      this.ws.on("open", () => {
        logMessage("✅ WebSocket连接已建立");
        this.reconnectAttempts = 0;
      });

      // 消息接收事件
      this.ws.on("message", (data) => {
        try {
          // 解析消息
          const messageData = parseMessageData(data);

          // 处理消息
          handleMessage(messageData);
        } catch (error) {
          logMessage(`处理消息时出错: ${error.message}`);
        }
      });

      // 连接错误事件
      this.ws.on("error", (error) => {
        logMessage(`❌ WebSocket错误: ${error.message}`);
      });

      // 连接关闭事件
      this.ws.on("close", (code, reason) => {
        logMessage(`❌ WebSocket连接已关闭: ${code} - ${reason}`);
        this.handleReconnect();
      });
    } catch (error) {
      logMessage(`连接WebSocket服务器时出错: ${error.message}`);
      this.handleReconnect();
    }
  }

  // 处理重连
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logMessage(
        `⏳ 尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );

      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      logMessage("❌ 达到最大重连尝试次数，连接失败");
    }
  }

  // 关闭WebSocket连接
  close() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }
}

// 创建单例实例
const webSocketService = new WebSocketService();

module.exports = webSocketService;
