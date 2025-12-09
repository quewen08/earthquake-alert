ENGLISH | [中文](README-zh.md)

# Earthquake Alert Service

A comprehensive alert service based on WebSocket that can real-time obtain earthquake, meteorological, tsunami and other alert information, and send notifications when attention conditions are met.

## Features

- Real-time connection to alert WebSocket service
- Support for multiple message types: earthquake, weather alarm, tsunami alert
- Refined source management, can configure each data source individually
- Configurable attention areas and threshold conditions
- Multiple notification methods: desktop notification, console log, file log, and Bark notification
- Intelligent message deduplication to avoid duplicate notifications
- Message priority differentiation: Focus area alerts have highest priority
- Time filtering functionality:
  - 8:00-20:00: Send all eligible alerts
  - 20:00-8:00 next day: Only send high-priority focus area alerts
- Modular architecture design for easy maintenance and expansion
- Support for Docker container deployment

## Quick Start

### Method 1: Run Directly

1. Install dependencies
```bash
npm install
```

2. Configure attention content (optional)
Edit the `config.yaml` file to set the message types, sources, and conditions you want to follow:
```yaml
# Watch area list (compatible with old configuration)
watch_areas:
  "四川": 4.0  # Sichuan
  "云南": 4.0  # Yunnan

# Message type configuration
message_types:
  enabled:
    - "earthquake"      # Earthquake messages
    - "weatheralarm"    # Weather alarm
    - "tsunami"         # Tsunami alert

# Source management configuration
# Can configure attention conditions for each data source individually
```

3. Start the service
```bash
npm start
```

### Method 2: Run with Docker

#### Using Docker Commands

1. Build Docker image
```bash
docker build -t earthquake-alert .
```

2. Run Docker container
```bash
docker run -d --name earthquake-alert -v ./config.yaml:/app/config.yaml -v ./earthquake_log.txt:/app/earthquake_log.txt -v ./sent_messages.json:/app/sent_messages.json --restart always earthquake-alert
```

3. View logs
```bash
docker logs -f earthquake-alert
```

#### Using Docker Compose (Recommended)

1. Ensure Docker Compose is installed

2. Start service
```bash
docker-compose up -d
```

3. View logs
```bash
docker-compose logs -f
```

4. Stop service
```bash
docker-compose down
```

## Configuration Instructions

The configuration file `config.yaml` contains the following main configuration items:

### WebSocket Connection
```yaml
websocket_url: "wss://ws.fanstudio.tech/all"
```

### Watch Areas (Compatible with Old Configuration)
Format: `City Name: Minimum Magnitude`
```yaml
watch_areas:
  "四川": 4.0  # Pay attention to earthquakes above 4.0 in Sichuan area
  "云南": 4.0  # Pay attention to earthquakes above 4.0 in Yunnan area
```

### Message Type Configuration
```yaml
message_types:
  # Enabled message types
  enabled:
    - "earthquake"      # Earthquake messages
    - "weatheralarm"    # Weather alarm
    - "tsunami"         # Tsunami alert
    # More types can be added as needed
```

### Source Management Configuration
```yaml
sources:
  # China Meteorological Administration weather alarm
  weatheralarm:
    enabled: true
    type: "weatheralarm"
    # Weather alarm configuration
    weatheralarm:
      # Focus alert levels: Red, Orange, Yellow, Blue
      levels: ["红色", "橙色", "黄色"]
      # Focus alert types: Strong wind, heavy rain, high temperature, etc.
      alert_types: ["大风", "暴雨", "高温", "寒潮"]
      # Focus areas
      areas: ["四川", "云南", "重庆"]  # Sichuan, Yunnan, Chongqing
  
  # Ministry of Natural Resources tsunami alert
  tsunami:
    enabled: true
    type: "tsunami"
    # Tsunami alert configuration
    tsunami:
      # Focus alert levels
      levels: ["红色", "橙色", "黄色", "蓝色", "解除"]
      # Focus areas
      areas: ["福建", "广东", "海南", "台湾"]  # Fujian, Guangdong, Hainan, Taiwan
  
  # China Earthquake Network Center earthquake information
  cenc:
    enabled: true
    type: "earthquake"
    # Earthquake configuration
    earthquake:
      # Minimum magnitude to focus on
      min_magnitude: 3.5
      # Focus areas
      areas: ["四川", "云南", "重庆"]  # Sichuan, Yunnan, Chongqing
```

### Notification Configuration
```yaml
notification:
  # Whether to enable desktop notification
  enable_desktop: true
  # Whether to log to file
  enable_log: true
  # Log file path
  log_file: "earthquake_log.txt"
  # Whether to display notifications in console
  enable_console: true
  # Bark notification configuration
  enable_bark: true
  # Bark server address
  bark_url: "https://api.day.app"
  # Bark device key
  bark_key: "your-bark-device-key"
  # Log file control configuration
  log_max_size: 10  # Maximum log file size, unit: MB
  log_max_days: 30  # Maximum log file retention days
```

## Message Deduplication Mechanism

The service automatically creates a `sent_messages.json` file to store unique IDs of sent messages, avoiding:
- Duplicate sending of the same message after service restart
- Same message being pushed multiple times

### Message ID Generation Strategy
- **Earthquake messages**: Use ID or combination of address + magnitude + time
- **Weather alarms**: Use combination of title + date (same alarm on the same day will not be repeated)
- **Tsunami alerts**: Use combination of title + date (same alert on the same day will not be repeated)
- **Other messages**: Use the first 100 characters of JSON string as identifier

### Manage Sent Records
- The service automatically manages records, keeping a maximum of 1000 recent messages
- You can manually delete the `sent_messages.json` file to reset records

## Bark Notification Usage

1. **Install Bark app**: Install Bark app on iOS device
2. **Get device key**: Open Bark app to get device key
3. **Configure Bark**: Set Bark parameters in `config.yaml`
4. **Receive notifications**: Eligible alert information will be pushed to your iOS device via Bark

## Data Sources

This service connects to `wss://ws.fanstudio.tech/all` via WebSocket to obtain the following types of alert information:

- **Earthquake messages**: China Earthquake Network Center, China Earthquake Early Warning Network, etc.
- **Weather alarms**: China Meteorological Administration
- **Tsunami alerts**: Ministry of Natural Resources

## Notes

1. Ensure stable network connection to receive real-time alert information
2. Desktop notification function may require system permissions, please set according to system prompts
3. Bark notification requires iOS device and Bark app support
4. It is recommended to regularly check the configuration file to update attention conditions
5. The service will automatically reconnect to WebSocket if the connection is interrupted

## License

MIT License

## Acknowledgments

- [FanStudio](https://www.fanstudio.tech/) for providing the earthquake alert data interface
- [China Earthquake Network Center](https://www.cenc.cn/) for providing earthquake information
- [China Meteorological Administration](https://www.meteoswiss.admin.ch/) for providing weather alarms
- [Ministry of Natural Resources](https://www.nrc.gov.cn/) for providing tsunami alerts