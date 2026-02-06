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

    // 心跳检测相关配置
    this.heartbeatInterval = 30000; // 30秒发送一次心跳
    this.pingTimeout = 30000; // 等待pong的超时时间
    this.missedPongs = 0;
    this.maxMissedPongs = 5; // 最多允许5次未收到pong
    this.heartbeatTimer = null;
    this.pingTimer = null;
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
        this.missedPongs = 0;
        this.startHeartbeat(); // 启动心跳检测
      });

      // 消息接收事件
      this.ws.on("message", (data) => {
        try {
          // 解析消息
          const parsedResult = parseMessageData(data);

          // 处理心跳相关消息
          if (
            (parsedResult && parsedResult.type === "heartbeat") ||
            (parsedResult && parsedResult.type === "pong")
          ) {
            console.log(`收到${parsedResult.type}消息，重置心跳检测`);
            this.resetHeartbeat();
          }
          // 处理其他消息
          else if (parsedResult && parsedResult.messages) {
            handleMessage(parsedResult.messages);
          }
        } catch (error) {
          logMessage(`处理消息时出错: ${error.message}`);
        }
      });

      // 连接错误事件
      this.ws.on("error", (error) => {
        logMessage(`❌ WebSocket错误: ${error.message}`);
        this.stopHeartbeat();
      });

      // 连接关闭事件
      this.ws.on("close", (code, reason) => {
        logMessage(`❌ WebSocket连接已关闭: ${code} - ${reason}`);
        this.stopHeartbeat();
        this.handleReconnect();
      });
    } catch (error) {
      logMessage(`连接WebSocket服务器时出错: ${error.message}`);
      this.stopHeartbeat();
      this.handleReconnect();
    }
  }

  // 处理重连
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logMessage(
        `⏳ 尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`,
      );

      setTimeout(() => {
        this.connect();
      }, this.reconnectInterval);
    } else {
      // 停止心跳检测
      this.stopHeartbeat();
      logMessage("❌ 达到最大重连尝试次数，连接失败");
      // 终止程序
      process.exit(1);
    }
  }

  // 关闭WebSocket连接
  close() {
    this.stopHeartbeat();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }

  // 启动心跳检测
  startHeartbeat() {
    this.stopHeartbeat(); // 先停止可能存在的心跳检测

    // 设置定时发送ping消息
    this.heartbeatTimer = setInterval(() => {
      this.sendPing();
    }, this.heartbeatInterval);

    logMessage("💓 心跳检测已启动");
  }

  // 停止心跳检测
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.pingTimer) {
      clearTimeout(this.pingTimer);
      this.pingTimer = null;
    }
  }

  // 重置心跳检测
  resetHeartbeat() {
    this.missedPongs = 0;

    if (this.pingTimer) {
      clearTimeout(this.pingTimer);
      this.pingTimer = null;
    }
  }

  // 发送ping消息
  sendPing() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        // 设置等待pong的超时定时器
        if (this.pingTimer) {
          clearTimeout(this.pingTimer);
          this.pingTimer = null;
        }
        this.pingTimer = setTimeout(() => {
          this.handlePingTimeout();
        }, this.pingTimeout);
        if (this.missedPongs == 0) {
          console.log("✅ 已经收到心跳消息,跳过发送ping消息");
          return;
        }
        logMessage("✅ 发送ping消息，当前未收到pong次数: " + this.missedPongs);
        const pingMessage = JSON.stringify({ type: "ping" });
        this.ws.send(pingMessage);
        console.log("📤 发送ping消息");
      } catch (error) {
        logMessage(`发送ping消息失败: ${error.message}`);
        this.handlePingTimeout();
      }
    } else {
      logMessage("WebSocket连接已关闭，无法发送ping消息");
      this.handlePingTimeout();
    }
  }

  // 处理ping超时
  handlePingTimeout() {
    this.missedPongs++;
    logMessage(
      `⌛ 未收到pong消息，累计未收到次数: ${this.missedPongs}/${this.maxMissedPongs}`,
    );

    if (this.missedPongs >= this.maxMissedPongs) {
      logMessage("❌ 累计3次未收到pong消息，重启WebSocket连接");
      this.stopHeartbeat();
      this.close();
      this.connect(); // 重新连接
    }
  }
}

// 创建单例实例
const webSocketService = new WebSocketService();

module.exports = webSocketService;
