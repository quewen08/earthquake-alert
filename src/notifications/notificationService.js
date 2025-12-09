const notifier = require("node-notifier");
const config = require("../config/config");
const { logMessage } = require("../utils/logger");

// 发送通知
function sendNotification(title, message, isHighPriority = false) {
  // 检查时间是否允许发送通知
  if (!shouldSendNotificationNow(isHighPriority)) {
    logMessage(`当前时间不允许发送通知，跳过: ${title}`);
    return;
  }

  new Promise((resolve, reject) => {
    try {
      _sendOsNotification(title, message, isHighPriority);
      _sendBarkNotification(title, message, isHighPriority);
      resolve();
    } catch (error) {
      logMessage(`发送通知失败: ${error.message}`);
      reject(error);
    }
  });
}

function _sendOsNotification(title, message, isHighPriority = false) {
  // 检查是否启用了桌面通知 && os 平台是否支持
  if (config.notification.enable_desktop && process.platform === "win32") {
    notifier.notify({
      title: title,
      message: message,
      sound: true,
      wait: true,
      priority: isHighPriority ? "high" : "normal",
    });
  }
}

//
function _sendBarkNotification(title, message, isHighPriority = false) {
  // 检查是否启用了Bark通知
  if (config.notification.enable_bark && config.notification.bark_key) {
    try {
      const http = require("http");
      const https = require("https");

      // 构建Bark通知URL
      const encodedTitle = encodeURIComponent(title);
      const encodedMessage = encodeURIComponent(message);
      const barkUrl = `${config.notification.bark_url}/${
        config.notification.bark_key
      }/${encodedTitle}/${encodedMessage}?group=${
        config.notification.bark_group
      }&isArchive=1${
        isHighPriority ? "&sound=silence" : "&level=critical&call=1&volume=1.0"
      }`;

      // 选择HTTP或HTTPS模块
      const protocol = barkUrl.startsWith("https") ? https : http;

      // 发送请求
      protocol
        .get(barkUrl, (res) => {
          logMessage(`Bark通知发送成功，状态码: ${res.statusCode}`);
        })
        .on("error", (error) => {
          logMessage(`Bark通知发送失败: ${error.message}`);
        });
    } catch (error) {
      logMessage(`Bark通知处理失败: ${error.message}`);
    }
  }
}

// 检查当前时间是否允许发送通知
function shouldSendNotificationNow(isHighPriority) {
  const now = new Date();
  const hour = now.getHours();

  // 如果是高优先级通知（关注区域），任何时间都允许发送
  if (isHighPriority) {
    return true;
  }

  // 普通通知只在8-20点发送
  return hour >= 8 && hour < 20;
}

module.exports = {
  sendNotification,
  shouldSendNotificationNow,
};
