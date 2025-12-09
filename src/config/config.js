const yaml = require("yaml");
const fs = require("fs");
const path = require("path");

// 读取配置文件
const configPath = path.join(__dirname, "../../config.yaml");
const config = yaml.parse(fs.readFileSync(configPath, "utf8"));

module.exports = config;
