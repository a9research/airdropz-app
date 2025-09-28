# Gaea挂机挖矿服务

## 功能特性

- **后台运行**: Python服务独立运行，不受前端页面切换影响
- **自动Ping**: 每10分钟自动调用ping接口保持账号活跃
- **信息更新**: 每30分钟更新一次账号挖矿信息
- **状态管理**: 实时显示账号运行状态
- **日志记录**: 详细的操作日志记录
- **批量操作**: 支持单个和批量开始/停止挖矿

## 文件结构

```
plugins/gaea/backend/services/
├── miningService.py          # 核心挖矿服务
├── miningApi.py              # HTTP API接口
├── startMiningService.py     # 服务启动脚本
├── requirements.txt          # Python依赖
└── README.md                 # 说明文档
```

## 安装和启动

### 1. 安装依赖

```bash
cd plugins/gaea/backend/services
pip3 install -r requirements.txt
```

### 2. 启动服务

```bash
# 使用启动脚本
../../../../scripts/start-mining-service.sh

# 或直接启动
python3 startMiningService.py
```

### 3. 停止服务

```bash
# 使用停止脚本
../../../../scripts/stop-mining-service.sh

# 或手动停止
pkill -f "miningService.py"
pkill -f "miningApi.py"
```

## API接口

服务运行在 `http://localhost:5001`

### 获取状态
```
GET /api/mining/status
```

### 获取账号列表
```
GET /api/mining/accounts
```

### 添加账号
```
POST /api/mining/accounts
{
  "id": "account_id",
  "name": "账号名称",
  "uid": "用户ID",
  "browser_id": "浏览器ID",
  "token": "认证令牌",
  "proxy": "代理地址(可选)"
}
```

### 开始挖矿
```
POST /api/mining/start/{account_id}
```

### 停止挖矿
```
POST /api/mining/stop/{account_id}
```

### 批量开始
```
POST /api/mining/start-all
```

### 批量停止
```
POST /api/mining/stop-all
```

### 获取日志
```
GET /api/mining/logs?limit=100
```

## 前端集成

前端通过Next.js API路由与Python服务通信：

- `/api/plugin/gaea/mining/status` - 获取状态
- `/api/plugin/gaea/mining/accounts` - 账号管理
- `/api/plugin/gaea/mining/start` - 开始挖矿
- `/api/plugin/gaea/mining/stop` - 停止挖矿
- `/api/plugin/gaea/mining/start-all` - 批量开始
- `/api/plugin/gaea/mining/stop-all` - 批量停止
- `/api/plugin/gaea/mining/logs` - 获取日志

## 配置说明

### Ping间隔
默认每10分钟ping一次，可在`miningService.py`中修改：
```python
self.ping_interval = 600  # 10分钟
```

### 信息更新间隔
默认每30分钟更新一次账号信息，可在`miningService.py`中修改：
```python
self.info_interval = 1800  # 30分钟
```

## 日志文件

服务日志保存在 `mining_service.log` 文件中，包含：
- 账号添加/移除记录
- Ping操作结果
- 错误信息
- 状态更新记录

## 注意事项

1. **Python环境**: 需要Python 3.7+
2. **网络连接**: 需要能够访问Gaea API
3. **代理支持**: 支持HTTP代理配置
4. **进程管理**: 服务独立运行，需要手动管理进程
5. **数据持久化**: 账号数据存储在内存中，重启后需要重新添加

## 故障排除

### 服务无法启动
1. 检查Python环境
2. 检查依赖是否安装完整
3. 检查端口5001是否被占用

### 账号Ping失败
1. 检查token是否有效
2. 检查网络连接
3. 检查代理配置

### 前端无法连接
1. 确认Python服务正在运行
2. 检查API路由配置
3. 查看浏览器控制台错误
