#!/usr/bin/env python3
"""
挂机挖矿服务启动脚本
"""

import os
import sys
import subprocess
import time
import signal
import threading
from pathlib import Path

# 添加当前目录到Python路径
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

def start_mining_service():
    """启动挖矿服务"""
    try:
        # 启动挖矿服务
        mining_process = subprocess.Popen([
            sys.executable, 'miningService.py'
        ], cwd=current_dir)
        
        # 启动API服务
        api_process = subprocess.Popen([
            sys.executable, 'miningApi.py'
        ], cwd=current_dir)
        
        print("挂机挖矿服务启动成功")
        print(f"挖矿服务PID: {mining_process.pid}")
        print(f"API服务PID: {api_process.pid}")
        
        # 等待进程结束
        try:
            mining_process.wait()
            api_process.wait()
        except KeyboardInterrupt:
            print("正在停止服务...")
            mining_process.terminate()
            api_process.terminate()
            mining_process.wait()
            api_process.wait()
            print("服务已停止")
            
    except Exception as e:
        print(f"启动服务失败: {e}")

if __name__ == "__main__":
    start_mining_service()
