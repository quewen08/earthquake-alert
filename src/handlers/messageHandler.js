const config = require("../config/config");
const { logMessage } = require("../utils/logger");
const { shouldNotify } = require("../filters/filterManager");
const { generateMessageId } = require("../utils/messageIdGenerator");
const {
  isMessageSent,
  markMessageAsSent,
} = require("../utils/sentMessagesManager");
const { sendNotification } = require("../notifications/notificationService");

// 处理消息
function handleMessage(messageData) {
  if (!messageData) {
    return;
  }

  // 确保处理的是数组
  const messages = Array.isArray(messageData) ? messageData : [messageData];

  // 遍历处理每个消息
  for (const message of messages) {
    try {
      if (!message) {
        continue;
      }

      const source = message.source;
      const sourceConfig = config.sources[source];

      if (!sourceConfig) {
        continue;
      }

      // 根据消息类型记录日志
      let logMsg;
      switch (sourceConfig.type) {
        case "earthquake":
          logMsg = `收到地震信息: ${message.address} ${message.mag}级 ${message.depth} ${message.time} (来源: ${source})`;
          break;
        case "weatheralarm":
          logMsg = `收到气象预警: ${message.headline} 时间: ${
            message.effective || ""
          } ${message.description || ""} (来源: ${source})`;
          break;
        case "tsunami":
          logMsg = `收到海啸预警: ${(message.warningInfo && message.warningInfo.title) || ""} ${
            (message.warningInfo && message.warningInfo.subtitle) || ""
          } ${
            message.timeInfo && message.timeInfo.alarmDate
              ? `时间: ${message.timeInfo.alarmDate}`
              : ""
          } (来源: ${source})`;
          break;
        default:
          logMsg = `收到消息: ${JSON.stringify(message)} (来源: ${source})`;
          break;
      }

      logMessage(logMsg);

      // 检查是否需要通知
      const notifyResult = shouldNotify(message, source);

      if (notifyResult.shouldNotify) {
        // 生成消息唯一ID
        const messageId = generateMessageId(message, source);

        // 检查消息是否已经发送过
        if (!messageId || !isMessageSent(messageId)) {
          let title, notificationMessage;

          // 根据消息类型生成通知内容
          switch (sourceConfig.type) {
            case "earthquake":
              title = `⚠️ 地震预警: ${message.address} (${message.source})`;
              notificationMessage = `${message.mag}级地震\n深度: ${message.depth}\n时间: ${message.time}\n位置: ${message.latitude}, ${message.longitude}`;
              break;

            case "weatheralarm":
              title = `🌤️ 气象预警: ${message.headline} (${message.source})`;
              notificationMessage = `${message.description}`;
              break;

            case "tsunami":
              title = `🌊 海啸预警: ${message.warningInfo.title} (${message.source})`;
              notificationMessage = `${
                message.warningInfo.subtitle || ""
              }\n时间: ${
                message.timeInfo
                  ? message.timeInfo.alarmDate
                  : new Date().toLocaleString()
              }`;
              break;

            default:
              title = `📢 预警通知: ${source} (${message.source})`;
              notificationMessage = JSON.stringify(message);
              break;
          }

          // 发送通知，传入优先级
          logMessage(
            `🚨 ${
              notifyResult.isHighPriority ? "高优先级" : "普通"
            }关注消息: ${title} - ${notificationMessage}`,
          );
          sendNotification(
            title,
            notificationMessage,
            notifyResult.isHighPriority,
          );

          // 标记消息为已发送
          markMessageAsSent(messageId);
        } else {
          logMessage(`消息已发送过，跳过通知: ${messageId}`);
        }
      }
    } catch (error) {
      logMessage(
        `处理消息时出错: ${error.message}, 消息内容: ${JSON.stringify(message)}`,
      );
    }
  }
}

module.exports = {
  handleMessage,
};
