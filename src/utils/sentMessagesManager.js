const fs = require("fs");
const path = require("path");
const { logMessage } = require("./logger");

// 已发送消息存储文件
const sentMessagesFile = path.join(__dirname, "../../sent_messages.json");

// 加载已发送消息记录
function loadSentMessages() {
  try {
    if (fs.existsSync(sentMessagesFile)) {
      const data = fs.readFileSync(sentMessagesFile, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    logMessage(`加载已发送消息记录失败: ${error.message}`);
  }
  return [];
}

// 保存已发送消息记录
function saveSentMessages(sentMessages) {
  try {
    fs.writeFileSync(sentMessagesFile, JSON.stringify(sentMessages), "utf8");
  } catch (error) {
    logMessage(`保存已发送消息记录失败: ${error.message}`);
  }
}

// 检查消息是否已发送
function isMessageSent(messageId) {
  const sentMessages = loadSentMessages();
  return sentMessages.includes(messageId);
}

// 标记消息为已发送
function markMessageAsSent(messageId) {
  const sentMessages = loadSentMessages();
  if (!sentMessages.includes(messageId)) {
    sentMessages.push(messageId);
    // 只保留最近1000条消息记录
    if (sentMessages.length > 1000) {
      sentMessages.shift();
    }
    saveSentMessages(sentMessages);
  }
}

module.exports = {
  loadSentMessages,
  saveSentMessages,
  isMessageSent,
  markMessageAsSent,
};
