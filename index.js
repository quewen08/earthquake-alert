const WebSocket = require("ws");
const yaml = require("yaml");
const fs = require("fs");
const path = require("path");
const notifier = require("node-notifier");

// 读取配置文件
const configPath = path.join(__dirname, "config.yaml");
const config = yaml.parse(fs.readFileSync(configPath, "utf8"));

// 已发送消息存储文件
const sentMessagesFile = path.join(__dirname, "sent_messages.json");

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

// 生成消息唯一ID
function generateMessageId(message, source) {
  const sourceConfig = config.sources[source];
  if (!sourceConfig) {
    return null;
  }

  switch (sourceConfig.type) {
    case "earthquake":
      // 地震消息使用ID或组合生成唯一标识
      return (
        message.id ||
        `${source}_${message.address}_${message.mag}_${message.time}`
      );
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

// 检查并管理日志文件
function manageLogFile() {
  try {
    const logPath = path.join(__dirname, config.notification.log_file);

    // 检查日志文件是否存在
    if (fs.existsSync(logPath)) {
      // 1. 检查日志文件大小
      const stats = fs.statSync(logPath);
      const fileSizeMB = stats.size / (1024 * 1024);
      const maxSizeMB = config.notification.log_max_size || 10;

      if (fileSizeMB > maxSizeMB) {
        // 备份当前日志文件
        const backupPath = `${logPath}.${new Date()
          .toISOString()
          .replace(/[:.]/g, "-")}`;
        fs.copyFileSync(logPath, backupPath);
        // 创建新的空日志文件
        fs.writeFileSync(logPath, "", "utf8");
        logMessage(`日志文件大小超过${maxSizeMB}MB，已创建备份: ${backupPath}`);
      }

      // 2. 检查日志文件保存时间（如果有配置）
      const maxDays = config.notification.log_max_days;
      if (maxDays) {
        const now = new Date();
        const fileDate = new Date(stats.mtime);
        const daysDiff = Math.floor((now - fileDate) / (1000 * 60 * 60 * 24));

        // 如果超过最大保存天数，删除文件
        if (daysDiff > maxDays) {
          fs.unlinkSync(logPath);
          logMessage(`日志文件已超过${maxDays}天，已删除`);
        }
      }
    }
  } catch (error) {
    console.error(`管理日志文件失败: ${error.message}`);
  }
}

// 日志记录函数
function logMessage(message) {
  const timestamp = new Date().toISOString();
  const log = `[${timestamp}] ${message}`;

  if (config.notification.enable_console) {
    console.log(log);
  }

  if (config.notification.enable_log) {
    // 在写入日志前检查并管理日志文件
    manageLogFile();
    fs.appendFileSync(config.notification.log_file, log + "\n", "utf8");
  }
}

// 发送桌面通知
function sendNotification(title, message) {
  // 检查是否启用了桌面通知 && os 平台是否支持
  if (config.notification.enable_desktop && process.platform === "win32") {
    notifier.notify({
      title: title,
      message: message,
      sound: true,
      wait: true,
    });
  }
  // 检查是否启用了Bark通知
  if (config.notification.enable_bark && config.notification.bark_key) {
    try {
      const http = require("http");
      const https = require("https");

      // 构建Bark通知URL
      const encodedTitle = encodeURIComponent(title);
      const encodedMessage = encodeURIComponent(message);
      const barkUrl = `${config.notification.bark_url}/${config.notification.bark_key}/${encodedTitle}/${encodedMessage}?level=critical&volume=1.0`;

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

// 根据消息类型和来源检查是否需要通知
function shouldNotify(message, source) {
  // 获取该来源的配置
  const sourceConfig = config.sources[source];

  // 检查来源是否启用
  if (!sourceConfig || !sourceConfig.enabled) {
    return false;
  }

  // 检查消息类型是否启用
  if (
    !config.message_types ||
    !config.message_types.enabled.includes(sourceConfig.type)
  ) {
    return false;
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
      return false;
  }
}

// 过滤地震消息
function filterEarthquake(earthquake, sourceConfig) {
  if (!earthquake.address || !earthquake.mag) {
    return false;
  }

  const earthquakeConfig = sourceConfig.earthquake;
  if (!earthquakeConfig) {
    return false;
  }

  // 检查震级是否满足要求
  if (earthquake.mag < earthquakeConfig.min_magnitude) {
    return false;
  }

  // 检查是否在关注地区内（如果有配置地区）
  if (earthquakeConfig.areas && earthquakeConfig.areas.length > 0) {
    for (const area of earthquakeConfig.areas) {
      if (earthquake.address.includes(area)) {
        return true;
      }
    }
    return false;
  }

  // 如果没有配置地区，则关注所有地区
  return true;
}

// 过滤气象预警消息
function filterWeatherAlarm(weather, sourceConfig) {
  if (!weather.headline || !weather.description) {
    return false;
  }

  const weatherConfig = sourceConfig.weatheralarm;
  if (!weatherConfig) {
    return false;
  }

  const headline = weather.headline;
  const description = weather.description;

  // 检查预警级别
  const levelMatch = weatherConfig.levels.some(
    (level) => headline.includes(level) || description.includes(level)
  );

  if (!levelMatch) {
    return false;
  }

  // 检查预警类型
  const typeMatch = weatherConfig.alert_types.some(
    (type) => headline.includes(type) || description.includes(type)
  );

  if (!typeMatch) {
    return false;
  }

  // 检查关注地区
  const areaMatch = weatherConfig.areas.some(
    (area) => headline.includes(area) || description.includes(area)
  );

  return areaMatch;
}

// 过滤海啸预警消息
function filterTsunami(tsunami, sourceConfig) {
  if (!tsunami.warningInfo || !tsunami.warningInfo.title) {
    return false;
  }

  const tsunamiConfig = sourceConfig.tsunami;
  if (!tsunamiConfig) {
    return false;
  }

  const title = tsunami.warningInfo.title;
  const subtitle = tsunami.warningInfo.subtitle || "";

  // 检查预警级别
  const levelMatch = tsunamiConfig.levels.some(
    (level) => title.includes(level) || subtitle.includes(level)
  );

  if (!levelMatch) {
    return false;
  }

  // 检查关注地区
  const areaMatch = tsunamiConfig.areas.some(
    (area) => title.includes(area) || subtitle.includes(area)
  );

  return areaMatch;
}

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
        return null;

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
        return messages.length > 0 ? messages : null;

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

          return message ? [message] : null;
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

// 处理消息
function handleMessage(messageData) {
  if (!messageData) {
    return;
  }

  // 确保处理的是数组
  const messages = Array.isArray(messageData) ? messageData : [messageData];

  // 遍历处理每个消息
  for (const message of messages) {
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
        logMsg = `收到海啸预警: ${message.warningInfo.title} ${
          message.warningInfo.subtitle || ""
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
    if (shouldNotify(message, source)) {
      // 生成消息唯一ID
      const messageId = generateMessageId(message, source);

      // 检查消息是否已经发送过
      if (!messageId || !isMessageSent(messageId)) {
        let title, notificationMessage;

        // 根据消息类型生成通知内容
        switch (sourceConfig.type) {
          case "earthquake":
            title = `⚠️ 地震预警: ${message.address}`;
            notificationMessage = `${message.mag}级地震\n深度: ${message.depth}\n时间: ${message.time}\n位置: ${message.latitude}, ${message.longitude}`;
            break;

          case "weatheralarm":
            title = `🌤️ 气象预警: ${message.headline}`;
            notificationMessage = `${message.description}`;
            break;

          case "tsunami":
            title = `🌊 海啸预警: ${message.warningInfo.title}`;
            notificationMessage = `${
              message.warningInfo.subtitle || ""
            }\n时间: ${
              message.timeInfo
                ? message.timeInfo.alarmDate
                : new Date().toLocaleString()
            }`;
            break;

          default:
            title = `📢 预警通知: ${source}`;
            notificationMessage = JSON.stringify(message);
            break;
        }

        // 发送通知
        logMessage(`🚨 关注消息: ${title} - ${notificationMessage}`);
        sendNotification(title, notificationMessage);

        // 标记消息为已发送
        markMessageAsSent(messageId);
      } else {
        logMessage(`消息已发送过，跳过通知: ${messageId}`);
      }
    }
  }
}

// 连接WebSocket
function connectWebSocket() {
  logMessage(`正在连接到WebSocket服务器: ${config.websocket_url}`);

  const ws = new WebSocket(config.websocket_url);

  ws.on("open", () => {
    logMessage("WebSocket连接成功");
  });

  ws.on("message", (data) => {
    try {
      const message = parseMessageData(data);
      handleMessage(message);
    } catch (error) {
      logMessage(`处理WebSocket消息失败: ${error.message}`);
    }
  });

  ws.on("error", (error) => {
    logMessage(`WebSocket错误: ${error.message}`);
  });

  ws.on("close", () => {
    logMessage("WebSocket连接关闭，正在尝试重连...");

    // 5秒后重连
    setTimeout(connectWebSocket, 5000);
  });

  return ws;
}

// 主函数
function main() {
  // 读取package.json
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, "package.json"), "utf8")
  );
  // 打印服务信息
  logMessage(`地震预警服务 ${packageJson.name} v${packageJson.version}`);

  logMessage("地震预警服务启动");

  // 连接WebSocket
  connectWebSocket();
}

// 启动服务
main();
