const webSocketService = require("./src/services/websocketService");
const { logMessage } = require("./src/utils/logger");

if (!process.env.TZ) {
  process.env.TZ = "Asia/Shanghai";
}

// 启动服务
function startService() {
  // 读取版本号
  const version = require("./package.json").version;
  const now = new Date();
  logMessage(`🚀 地震预警服务启动... 版本: ${version}`);
  logMessage(`📅 当前时间: ${now.toLocaleString()}`);

  // 初始化WebSocket服务
  webSocketService.init();
}

// 启动服务
startService();

// 处理进程退出事件
process.on("SIGINT", () => {
  logMessage("📝 服务已停止");
  webSocketService.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logMessage("📝 服务已停止");
  webSocketService.close();
  process.exit(0);
});
