const config = require("../config/config");

// 过滤海啸预警消息并判断优先级
function filterTsunami(tsunami, sourceConfig) {
  if (!tsunami.warningInfo || !tsunami.warningInfo.title) {
    return { shouldNotify: false, isHighPriority: false };
  }

  const tsunamiConfig = sourceConfig.tsunami;
  if (!tsunamiConfig) {
    return { shouldNotify: false, isHighPriority: false };
  }

  const title = tsunami.warningInfo.title;
  const subtitle = tsunami.warningInfo.subtitle || "";

  // 检查预警级别
  const levelMatch = tsunamiConfig.levels.some(
    (level) => title.includes(level) || subtitle.includes(level)
  );

  if (!levelMatch) {
    return { shouldNotify: false, isHighPriority: false };
  }

  // 检查关注地区
  const areaMatch = tsunamiConfig.areas.some(
    (area) => title.includes(area) || subtitle.includes(area)
  );

  return { shouldNotify: areaMatch, isHighPriority: areaMatch };
}

module.exports = {
  filterTsunami,
};
