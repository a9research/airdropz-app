#!/bin/bash

# 挂机挖矿服务停止脚本

echo "停止挂机挖矿服务..."

# 进入Python服务目录
cd plugins/gaea/backend/services

# 检查PID文件
if [ -f "mining_service.pid" ]; then
    PID=$(cat mining_service.pid)
    echo "找到服务PID: $PID"
    
    # 停止服务
    if kill -0 $PID 2>/dev/null; then
        echo "停止服务进程..."
        kill $PID
        sleep 2
        
        # 强制停止（如果还在运行）
        if kill -0 $PID 2>/dev/null; then
            echo "强制停止服务进程..."
            kill -9 $PID
        fi
        
        echo "服务已停止"
    else
        echo "服务进程不存在"
    fi
    
    # 删除PID文件
    rm -f mining_service.pid
else
    echo "未找到PID文件，尝试停止所有相关进程..."
    pkill -f "miningService.py"
    pkill -f "miningApi.py"
fi

echo "挂机挖矿服务停止完成"
