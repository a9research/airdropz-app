#!/bin/bash

# 挂机挖矿服务启动脚本

echo "启动挂机挖矿服务..."

# 进入Python服务目录
cd plugins/gaea/backend/services

# 检查Python环境
if ! command -v python3 &> /dev/null; then
    echo "错误: 未找到Python3"
    exit 1
fi

# 安装依赖
echo "安装Python依赖..."
pip3 install flask flask-cors requests

# 启动服务
echo "启动挖矿服务..."
python3 startMiningService.py &

# 获取进程ID
SERVICE_PID=$!
echo "挖矿服务PID: $SERVICE_PID"

# 保存PID到文件
echo $SERVICE_PID > mining_service.pid

echo "挂机挖矿服务启动完成"
echo "API地址: http://localhost:5001"
echo "停止服务: kill $SERVICE_PID"
