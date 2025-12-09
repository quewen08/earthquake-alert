const config = require("../config/config");

// 过滤地震消息并判断优先级
function filterEarthquake(earthquake, sourceConfig) {
  if (!earthquake.address || !earthquake.mag) {
    return { shouldNotify: false, isHighPriority: false };
  }

  const earthquakeConfig = sourceConfig.earthquake;
  if (!earthquakeConfig) {
    return { shouldNotify: false, isHighPriority: false };
  }

  // 检查震级是否满足要求
  if (earthquake.mag < earthquakeConfig.min_magnitude) {
    return { shouldNotify: false, isHighPriority: false };
  }

  // 检查是否在关注地区内（如果有配置地区）
  if (earthquakeConfig.areas && earthquakeConfig.areas.length > 0) {
    for (const area of earthquakeConfig.areas) {
      if (earthquake.address.includes(area)) {
        return { shouldNotify: true, isHighPriority: true };
      }
    }
    return { shouldNotify: false, isHighPriority: false };
  }

  // 如果没有配置地区，则关注所有地区，但优先级为普通
  return { shouldNotify: true, isHighPriority: false };
}

module.exports = {
  filterEarthquake,
};
