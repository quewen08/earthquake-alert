const config = require("../config/config");
const { logMessage } = require("../utils/logger");
const { parseSingleEarthquake } = require("./earthquakeParser");

// 解析消息数据
function parseMessageData(data) {
  try {
    const parsed = JSON.parse(data);

    // 根据消息类型处理
    switch (parsed.type) {
      case "heartbeat":
      case "pong":
        // 忽略心跳包和pong消息
        console.log(`收到${parsed.type}消息`);
        // 返回心跳消息，供websocketService处理
        return { type: parsed.type };

      case "initial_all":
        // 处理包含多个数据的initial_all消息
        const messages = [];

        // 遍历所有可能包含数据的字段
        for (const [key, value] of Object.entries(parsed)) {
          // 跳过type字段和没有Data子字段的字段
          if (key === "type" || !value.Data) {
            continue;
          }

          // 根据来源类型处理不同的数据
          const sourceConfig = config.sources[key];
          if (sourceConfig) {
            let message = null;

            // 根据消息类型解析不同的数据结构
            switch (sourceConfig.type) {
              case "earthquake":
                message = parseSingleEarthquake(value.Data, key);
                break;
              case "weatheralarm":
                message = value.Data;
                message.source = key;
                break;
              case "tsunami":
                message = value.Data;
                message.source = key;
                break;
              default:
                // 默认尝试解析为地震数据
                message = parseSingleEarthquake(value.Data, key);
                break;
            }

            if (message) {
              messages.push(message);
            }
          }
        }

        // 返回消息数据数组
        return messages.length > 0 ? { messages: messages } : null;

      case "update":
        // 处理单个数据更新
        const source = parsed.source;
        const messageData = parsed.Data;

        if (source && messageData) {
          const sourceConfig = config.sources[source];
          let message = null;

          // 根据消息类型解析不同的数据结构
          if (sourceConfig) {
            switch (sourceConfig.type) {
              case "earthquake":
                message = parseSingleEarthquake(messageData, source);
                break;
              case "weatheralarm":
                message = messageData;
                message.source = source;
                break;
              case "tsunami":
                message = messageData;
                message.source = source;
                break;
              default:
                // 默认尝试解析为地震数据
                message = parseSingleEarthquake(messageData, source);
                break;
            }
          }

          return message ? { messages: [message] } : null;
        }
        break;

      default:
        logMessage(
          `未知消息类型: ${parsed.type}, 数据: ${JSON.stringify(parsed)}`
        );
        break;
    }
  } catch (error) {
    logMessage(`解析消息数据失败: ${error.message}, 数据: ${data}`);
  }

  return null;
}

module.exports = {
  parseMessageData,
};
