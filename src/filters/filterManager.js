const config = require("../config/config");
const { filterEarthquake } = require("./earthquakeFilter");
const { filterWeatherAlarm } = require("./weatherAlarmFilter");
const { filterTsunami } = require("./tsunamiFilter");

// 根据消息类型和来源检查是否需要通知
function shouldNotify(message, source) {
  // 获取该来源的配置
  const sourceConfig = config.sources[source];

  // 检查来源是否启用
  if (!sourceConfig || !sourceConfig.enabled) {
    return { shouldNotify: false, isHighPriority: false };
  }

  // 检查消息类型是否启用
  if (
    !config.message_types ||
    !config.message_types.enabled.includes(sourceConfig.type)
  ) {
    return { shouldNotify: false, isHighPriority: false };
  }

  // 根据消息类型进行不同的过滤逻辑
  switch (sourceConfig.type) {
    case "earthquake":
      return filterEarthquake(message, sourceConfig);

    case "weatheralarm":
      return filterWeatherAlarm(message, sourceConfig);

    case "tsunami":
      return filterTsunami(message, sourceConfig);

    default:
      return { shouldNotify: false, isHighPriority: false };
  }
}

module.exports = {
  shouldNotify,
};
