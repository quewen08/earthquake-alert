const config = require("../config/config");

// 过滤气象预警消息并判断优先级
function filterWeatherAlarm(weather, sourceConfig) {
  if (!weather.headline || !weather.description) {
    return { shouldNotify: false, isHighPriority: false };
  }

  const weatherConfig = sourceConfig.weatheralarm;
  if (!weatherConfig) {
    return { shouldNotify: false, isHighPriority: false };
  }

  const headline = weather.headline;
  const description = weather.description;

  // 检查预警级别
  const levelMatch = weatherConfig.levels.some(
    (level) => headline.includes(level) || description.includes(level)
  );

  if (!levelMatch) {
    return { shouldNotify: false, isHighPriority: false };
  }

  // 检查预警类型
  const typeMatch = weatherConfig.alert_types.some(
    (type) => headline.includes(type) || description.includes(type)
  );

  if (!typeMatch) {
    return { shouldNotify: false, isHighPriority: false };
  }

  // 检查关注地区
  const areaMatch = weatherConfig.areas.some(
    (area) => headline.includes(area) || description.includes(area)
  );

  return { shouldNotify: areaMatch, isHighPriority: areaMatch };
}

module.exports = {
  filterWeatherAlarm,
};
