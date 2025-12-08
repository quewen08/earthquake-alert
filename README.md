# 地震预警服务

一个基于WebSocket的综合预警服务，可以实时获取地震、气象和海啸等预警信息，并在关注条件满足时发送通知。

## 功能特性

- 实时连接预警WebSocket服务
- 支持多种消息类型：地震、气象预警、海啸预警
- 精细化的来源管理，可单独配置每个数据源
- 可配置关注地区和阈值条件
- 多种通知方式：桌面通知、控制台日志、文件日志和Bark通知
- 智能消息去重，避免重复通知
- 支持Docker容器化部署

## 快速开始

### 方法一：直接运行

1. 安装依赖
```bash
npm install
```

2. 配置关注内容（可选）
编辑 `config.yaml` 文件，设置需要关注的消息类型、来源和条件：
```yaml
# 关注的地区列表（兼容旧配置）
watch_areas:
  "四川": 4.0
  "云南": 4.0

# 消息类型配置
message_types:
  enabled:
    - "earthquake"      # 地震消息
    - "weatheralarm"    # 气象预警
    - "tsunami"         # 海啸预警

# 来源管理配置
# 可单独配置每个数据源的关注条件
```

3. 启动服务
```bash
npm start
```

### 方法二：使用Docker运行

1. 构建Docker镜像
```bash
docker build -t earthquake-alert .
```

2. 运行Docker容器
```bash
docker run -d --name earthquake-alert earthquake-alert
```

3. 查看日志
```bash
docker logs -f earthquake-alert
```

## 配置说明

配置文件 `config.yaml` 包含以下主要配置项：

### WebSocket连接
```yaml
websocket_url: "wss://ws.fanstudio.tech/all"
```

### 关注地区（兼容旧配置）
格式：`城市名称: 最小震级`
```yaml
watch_areas:
  "四川": 4.0  # 关注四川地区4.0级以上地震
  "云南": 4.0  # 关注云南地区4.0级以上地震
```

### 消息类型配置
```yaml
message_types:
  # 启用的消息类型
  enabled:
    - "earthquake"      # 地震消息
    - "weatheralarm"    # 气象预警
    - "tsunami"         # 海啸预警
    # 可以根据需要添加更多类型
```

### 来源管理配置
```yaml
sources:
  # 中国气象局气象预警
  weatheralarm:
    enabled: true
    type: "weatheralarm"
    # 气象预警配置
    weatheralarm:
      # 关注的预警级别: 红色, 橙色, 黄色, 蓝色
      levels: ["红色", "橙色", "黄色"]
      # 关注的预警类型: 大风, 暴雨, 高温等
      alert_types: ["大风", "暴雨", "高温", "寒潮"]
      # 关注的地区
      areas: ["四川", "云南", "重庆"]
  
  # 自然资源部海啸预警
  tsunami:
    enabled: true
    type: "tsunami"
    # 海啸预警配置
    tsunami:
      # 关注的预警级别
      levels: ["红色", "橙色", "黄色", "蓝色", "解除"]
      # 关注的地区
      areas: ["福建", "广东", "海南", "台湾"]
  
  # 中国地震台网地震信息
  cenc:
    enabled: true
    type: "earthquake"
    # 地震配置
    earthquake:
      # 关注的最小震级
      min_magnitude: 3.5
      # 关注的地区
      areas: ["四川", "云南", "重庆"]
```

### 通知配置
```yaml
notification:
  # 是否启用桌面通知
  enable_desktop: true
  # 是否记录日志到文件
  enable_log: true
  # 日志文件路径
  log_file: "earthquake_log.txt"
  # 是否在控制台显示通知
  enable_console: true
  # Bark通知配置
  enable_bark: true
  # Bark服务器地址
  bark_url: "https://api.day.app"
  # Bark设备密钥
  bark_key: "your-bark-device-key"
```

## 消息去重机制

服务会自动创建 `sent_messages.json` 文件存储已发送消息的唯一ID，避免：
- 服务重启后重复发送相同消息
- 同一消息被多次推送

### 消息ID生成策略
- **地震消息**：使用ID或地址+震级+时间组合
- **气象预警**：使用标题+日期组合（同一天内相同预警不重复）
- **海啸预警**：使用标题+日期组合（同一天内相同预警不重复）
- **其他消息**：使用JSON字符串前100个字符作为标识

### 管理已发送记录
- 服务会自动管理记录，最多保留1000条最近消息
- 可手动删除 `sent_messages.json` 文件重置记录

## Bark通知使用

1. **安装Bark应用**：在iOS设备上安装Bark应用
2. **获取设备密钥**：打开Bark应用获取设备密钥
3. **配置Bark**：在 `config.yaml` 中设置Bark参数
4. **接收通知**：符合条件的预警信息将通过Bark推送到您的iOS设备

## 数据来源

本服务通过WebSocket连接到 `wss://ws.fanstudio.tech/all` 获取以下类型的预警信息：

- **地震消息**：中国地震台网、中国地震预警网等
- **气象预警**：中国气象局
- **海啸预警**：自然资源部

## 注意事项

1. 确保网络连接稳定，以便实时接收预警信息
2. 桌面通知功能可能需要系统权限，请根据系统提示进行设置
3. Bark通知需要iOS设备和Bark应用支持
4. 建议定期检查配置文件，更新关注条件
5. 服务会自动重连WebSocket，如果连接中断

## 许可证

MIT License

## 感谢

- [FanStudio](https://www.fanstudio.tech/) 提供的地震预警数据接口
- [中国地震台网](https://www.cenc.cn/) 提供的地震信息
- [中国气象局](https://www.meteoswiss.admin.ch/) 提供的气象预警
- [自然资源部](https://www.nrc.gov.cn/) 提供的海啸预警

## 贡献

欢迎提交Pull Request改进本项目！

## 问题反馈

如果您在使用过程中遇到问题，请通过[GitHub Issues](https://github.com/quewen08/earthquake-alert/issues)反馈。