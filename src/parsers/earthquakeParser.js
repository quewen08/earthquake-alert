// 解析单个地震数据项
function parseSingleEarthquake(data, source) {
  // 根据不同数据源的字段名映射
  const magFields = ["mag", "magnitude", "Magnitude"];
  const addressFields = ["address", "placeName", "place", "location"];
  const timeFields = ["time", "shockTime", "updateTime", "eventTime"];
  const depthFields = ["depth", "Depth"];
  const latFields = ["latitude", "Latitude"];
  const lonFields = ["longitude", "Longitude"];
  const idFields = ["id", "eventId", "EventId"];

  // 尝试从不同字段名中获取值
  function getValue(fields) {
    for (const field of fields) {
      if (data[field] !== undefined && data[field] !== null) {
        return data[field];
      }
    }
    return null;
  }

  const mag = parseFloat(getValue(magFields));
  const address = getValue(addressFields);

  // 只有当震级和地址都存在时才返回有效地震信息
  if (!mag || !address) {
    return null;
  }

  return {
    id: getValue(idFields) || Date.now(),
    address: address,
    mag: mag,
    depth: getValue(depthFields) || "",
    time: getValue(timeFields) || new Date().toLocaleString(),
    latitude: getValue(latFields) || "",
    longitude: getValue(lonFields) || "",
    source: source,
  };
}

module.exports = {
  parseSingleEarthquake,
};
