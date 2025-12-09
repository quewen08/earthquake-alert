const fs = require("fs");
const path = require("path");
const config = require("../config/config");

// 检查并管理日志文件
function manageLogFile() {
  try {
    const logPath = path.join(
      __dirname,
      "../../",
      config.notification.log_file
    );

    // 检查日志文件是否存在
    if (fs.existsSync(logPath)) {
      // 1. 检查日志文件大小
      const stats = fs.statSync(logPath);
      const fileSizeMB = stats.size / (1024 * 1024);
      const maxSizeMB = config.notification.log_max_size || 10;

      if (fileSizeMB > maxSizeMB) {
        // 备份当前日志文件
        const backupPath = `${logPath}.${new Date()
          .toISOString()
          .replace(/[:.]/g, "-")}`;
        fs.copyFileSync(logPath, backupPath);
        // 创建新的空日志文件
        fs.writeFileSync(logPath, "", "utf8");
        logMessage(`日志文件大小超过${maxSizeMB}MB，已创建备份: ${backupPath}`);
      }

      // 2. 检查日志文件保存时间（如果有配置）
      const maxDays = config.notification.log_max_days;
      if (maxDays) {
        const now = new Date();
        const fileDate = new Date(stats.mtime);
        const daysDiff = Math.floor((now - fileDate) / (1000 * 60 * 60 * 24));

        // 如果超过最大保存天数，删除文件
        if (daysDiff > maxDays) {
          fs.unlinkSync(logPath);
          logMessage(`日志文件已超过${maxDays}天，已删除`);
        }
      }
    }
  } catch (error) {
    console.error(`管理日志文件失败: ${error.message}`);
  }
}

// 日志记录函数
function logMessage(message) {
  const timestamp = new Date().toISOString();
  const log = `[${timestamp}] ${message}`;

  if (config.notification.enable_console) {
    console.log(log);
  }

  if (config.notification.enable_log) {
    // 在写入日志前检查并管理日志文件
    manageLogFile();
    fs.appendFileSync(config.notification.log_file, log + "\n", "utf8");
  }
}

module.exports = {
  logMessage,
};
