const config = require("../config/config");

// 生成消息唯一ID
function generateMessageId(message, source) {
  const sourceConfig = config.sources[source];
  if (!sourceConfig) {
    return null;
  }

  switch (sourceConfig.type) {
    case "earthquake":
      // 地震消息优化：基于地址、震级范围和时间窗口生成唯一标识
      // 目的：避免同一地震事件的多次更新或不同来源的同一事件导致重复通知
      const address = message.address;
      const mag = parseFloat(message.mag);

      if (!address || isNaN(mag)) {
        return `${source}_${JSON.stringify(message).substring(0, 100)}`;
      }

      // 将震级按0.5级为区间分组，避免震级微小变化导致重复通知
      const magRange = Math.floor(mag * 2) / 2;

      // 获取事件时间，如果没有则使用当前时间
      let eventTime = new Date();
      if (message.time) {
        try {
          eventTime = new Date(message.time);
        } catch (e) {
          // 如果时间解析失败，使用当前时间
          eventTime = new Date();
        }
      }

      // 将时间按10分钟为窗口分组，同一地区10分钟内的地震视为同一事件
      const timeWindow = Math.floor(eventTime.getTime() / (10 * 60 * 1000));

      // 生成唯一标识：地址_震级范围_时间窗口
      // 不包含source，确保不同来源的同一事件生成相同ID
      return `earthquake_${address}_${magRange}_${timeWindow}`;

    case "weatheralarm":
      // 气象预警使用标题和时间组合
      return `${source}_${message.headline}_${new Date().toDateString()}`;
    case "tsunami":
      // 海啸预警使用标题和时间组合
      return `${source}_${
        message.warningInfo.title
      }_${new Date().toDateString()}`;
    default:
      // 其他消息使用JSON字符串的哈希值
      return `${source}_${JSON.stringify(message).substring(0, 100)}`;
  }
}

module.exports = {
  generateMessageId,
};
