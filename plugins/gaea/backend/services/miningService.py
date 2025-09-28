#!/usr/bin/env python3
"""
Gaea挂机挖矿服务
实现账号ping接口调用和后台运行
"""

import asyncio
import json
import logging
import time
import requests
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Set
from dataclasses import dataclass, asdict
import os
import sys

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('mining_service.log')
    ]
)
logger = logging.getLogger(__name__)

@dataclass
class MiningAccount:
    """挖矿账号信息"""
    id: str
    name: str
    uid: str
    browser_id: str
    token: str
    proxy: Optional[str] = None
    status: str = "stopped"  # stopped, running, error
    last_ping: Optional[str] = None
    last_info: Optional[Dict] = None
    error_count: int = 0
    created_at: str = ""
    updated_at: str = ""

@dataclass
class MiningStatus:
    """挖矿状态"""
    total_accounts: int = 0
    running_accounts: int = 0
    stopped_accounts: int = 0
    error_accounts: int = 0
    last_update: str = ""

class MiningService:
    """挂机挖矿服务"""
    
    def __init__(self):
        self.accounts: Dict[str, MiningAccount] = {}
        self.running_accounts: Set[str] = set()
        self.status = MiningStatus()
        self.is_running = False
        self.lock = threading.Lock()
        self.ping_interval = 600  # 10分钟
        self.info_interval = 1800  # 30分钟
        
        # 延迟启动线程管理
        self.delayed_threads: Dict[str, threading.Thread] = {}
        self.stop_delayed_start = False
        
        # 启动状态更新线程
        self.status_thread = threading.Thread(target=self._update_status_loop, daemon=True)
        self.status_thread.start()
        
        # logger.info("挂机挖矿服务初始化完成")
    
    def add_account(self, account_data: Dict) -> bool:
        """添加账号"""
        try:
            account = MiningAccount(
                id=account_data['id'],
                name=account_data['name'],
                uid=account_data['uid'],
                browser_id=account_data.get('browser_id', ''),
                token=account_data['token'],
                proxy=account_data.get('proxy'),
                created_at=datetime.now().isoformat(),
                updated_at=datetime.now().isoformat()
            )
            
            with self.lock:
                self.accounts[account.id] = account
                self.status.total_accounts = len(self.accounts)
            
            logger.info(f"添加账号: {account.name} ({account.id})")
            return True
        except Exception as e:
            logger.error(f"添加账号失败: {e}")
            return False
    
    def sync_accounts_from_database(self, accounts_data: List[Dict]) -> int:
        """从数据库同步账号数据"""
        try:
            synced_count = 0
            with self.lock:
                # 保存当前正在运行的账号
                running_account_ids = set(self.running_accounts)
                
                # 清空现有账号
                self.accounts.clear()
                self.running_accounts.clear()
                
                # 添加新账号
                for account_data in accounts_data:
                    account_id = account_data['id']
                    was_running = account_id in running_account_ids
                    
                    account = MiningAccount(
                        id=account_id,
                        name=account_data['name'],
                        uid=account_data['uid'],
                        browser_id=account_data.get('browser_id', ''),
                        token=account_data['token'],
                        proxy=account_data.get('proxy'),
                        status='running' if was_running else 'stopped',  # 保持运行状态
                        created_at=account_data.get('created_at', datetime.now().isoformat()),
                        updated_at=datetime.now().isoformat()
                    )
                    
                    self.accounts[account.id] = account
                    
                    # 如果之前正在运行，重新启动
                    if was_running:
                        self.running_accounts.add(account_id)
                        # 启动账号的ping线程
                        thread = threading.Thread(
                            target=self._account_ping_loop,
                            args=(account_id,),
                            daemon=True
                        )
                        thread.start()
                        # logger.info(f"重新启动账号挖矿: {account.name} ({account_id})")
                    
                    synced_count += 1
                
                self.status.total_accounts = len(self.accounts)
                self.status.stopped_accounts = len(self.accounts)
                self.status.running_accounts = 0
                self.status.error_accounts = 0
                self.status.last_update = datetime.now().isoformat()
            
            # logger.info(f"同步账号数据: {synced_count} 个账号")
            return synced_count
        except Exception as e:
            logger.error(f"同步账号数据失败: {e}")
            return 0
    
    def remove_account(self, account_id: str) -> bool:
        """移除账号"""
        try:
            with self.lock:
                if account_id in self.accounts:
                    account = self.accounts[account_id]
                    if account_id in self.running_accounts:
                        self.running_accounts.remove(account_id)
                    del self.accounts[account_id]
                    self.status.total_accounts = len(self.accounts)
                    logger.info(f"移除账号: {account.name} ({account_id})")
                    return True
            return False
        except Exception as e:
            logger.error(f"移除账号失败: {e}")
            return False
    
    def start_account(self, account_id: str) -> bool:
        """开始单个账号挖矿"""
        try:
            with self.lock:
                if account_id in self.accounts:
                    account = self.accounts[account_id]
                    if account_id not in self.running_accounts:
                        self.running_accounts.add(account_id)
                        account.status = "running"
                        account.updated_at = datetime.now().isoformat()
                        
                        # 启动账号的ping线程
                        thread = threading.Thread(
                            target=self._account_ping_loop,
                            args=(account_id,),
                            daemon=True
                        )
                        thread.start()
                        
                        # logger.info(f"开始账号挖矿: {account.name} ({account_id})")
                        return True
            return False
        except Exception as e:
            logger.error(f"开始账号挖矿失败: {e}")
            return False
    
    def stop_account(self, account_id: str) -> bool:
        """停止单个账号挖矿"""
        try:
            with self.lock:
                if account_id in self.running_accounts:
                    self.running_accounts.remove(account_id)
                    if account_id in self.accounts:
                        self.accounts[account_id].status = "stopped"
                        self.accounts[account_id].updated_at = datetime.now().isoformat()
                    
                        # logger.info(f"停止账号挖矿: {account_id}")
                    return True
            return False
        except Exception as e:
            logger.error(f"停止账号挖矿失败: {e}")
            return False
    
    def start_all_accounts(self) -> int:
        """开始所有账号挖矿（10分钟内随机开始）"""
        import random
        
        started_count = 0
        account_ids = list(self.accounts.keys())
        
        # 重置停止标志
        self.stop_delayed_start = False
        
        # 为每个账号分配随机延迟时间（0-600秒，即0-10分钟）
        for account_id in account_ids:
            # 生成0-600秒的随机延迟
            delay_seconds = random.randint(0, 600)
            
            # 创建延迟启动线程
            def delayed_start(acc_id, delay):
                import time
                time.sleep(delay)
                # 检查是否应该停止延迟启动
                if not self.stop_delayed_start and acc_id in self.accounts:
                    if self.start_account(acc_id):
                        # logger.info(f"延迟启动账号挖矿: {self.accounts[acc_id].name} (延迟 {delay} 秒)")
                        pass
            
            thread = threading.Thread(
                target=delayed_start,
                args=(account_id, delay_seconds),
                daemon=True
            )
            thread.start()
            self.delayed_threads[account_id] = thread
            started_count += 1
        
        # logger.info(f"开始所有账号挖矿: {started_count}/{len(self.accounts)} (10分钟内随机启动)")
        return started_count
    
    def stop_all_accounts(self) -> int:
        """停止所有账号挖矿"""
        # 设置停止标志，阻止延迟启动线程
        self.stop_delayed_start = True
        
        # 停止所有正在运行的账号
        stopped_count = len(self.running_accounts)
        for account_id in list(self.running_accounts):
            self.stop_account(account_id)
        
        # 清理延迟启动线程
        self.delayed_threads.clear()
        
        # logger.info(f"停止所有账号挖矿: {stopped_count}")
        return stopped_count
    
    def _account_ping_loop(self, account_id: str):
        """账号ping循环"""
        while account_id in self.running_accounts:
            try:
                if account_id not in self.accounts:
                    break
                
                account = self.accounts[account_id]
                self._ping_account(account)
                
                # 等待下次ping
                time.sleep(self.ping_interval)
                
            except Exception as e:
                logger.error(f"账号 {account_id} ping循环错误: {e}")
                with self.lock:
                    if account_id in self.accounts:
                        self.accounts[account_id].status = "error"
                        self.accounts[account_id].error_count += 1
                time.sleep(60)  # 错误后等待1分钟再重试
    
    def _ping_account(self, account: MiningAccount):
        """执行账号ping"""
        try:
            url = "https://api.aigaea.net/api/network/ping"
            headers = {
                "accept": "*/*",
                "accept-language": "en-US",
                "authorization": f"Bearer {account.token}",
                "content-type": "application/json",
                "priority": "u=1, i",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "none"
            }
            
            data = {
                "uid": account.uid,
                "browser_id": account.browser_id,
                "timestamp": int(time.time()),
                "version": "3.0.20"
            }
            
            # 配置代理
            proxies = None
            if account.proxy:
                proxies = {
                    'http': account.proxy,
                    'https': account.proxy
                }
            
            response = requests.post(url, headers=headers, json=data, proxies=proxies, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    account.status = "running"
                    account.last_ping = datetime.now().isoformat()
                    account.error_count = 0
                    logger.info(f"账号 {account.name} ping成功: {result.get('data', {})}")
                else:
                    account.status = "error"
                    account.error_count += 1
                    logger.warning(f"账号 {account.name} ping失败: {result.get('msg', 'Unknown error')}")
            else:
                account.status = "error"
                account.error_count += 1
                logger.warning(f"账号 {account.name} ping失败: HTTP {response.status_code}")
                
        except Exception as e:
            account.status = "error"
            account.error_count += 1
            logger.error(f"账号 {account.name} ping异常: {e}")
    
    def _update_account_info(self, account: MiningAccount):
        """更新账号信息"""
        try:
            url = "https://api.aigaea.net/api/earn/info"
            headers = {
                "accept": "*/*",
                "accept-language": "en-US",
                "authorization": f"Bearer {account.token}",
                "content-type": "application/json",
                "priority": "u=1, i",
                "sec-ch-ua": '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": '"Windows"',
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "same-site",
                "Referer": "https://app.aigaea.net/",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            }
            
            # 配置代理
            proxies = None
            if account.proxy:
                proxies = {
                    'http': account.proxy,
                    'https': account.proxy
                }
            
            response = requests.get(url, headers=headers, proxies=proxies, timeout=30)
            
            if response.status_code == 200:
                result = response.json()
                if result.get('success'):
                    account.last_info = result.get('data', {})
                    logger.info(f"账号 {account.name} 信息更新成功")
                else:
                    logger.warning(f"账号 {account.name} 信息更新失败: {result.get('msg', 'Unknown error')}")
            else:
                logger.warning(f"账号 {account.name} 信息更新失败: HTTP {response.status_code}")
                
        except Exception as e:
            logger.error(f"账号 {account.name} 信息更新异常: {e}")
    
    def _update_status_loop(self):
        """状态更新循环"""
        while True:
            try:
                with self.lock:
                    self.status.running_accounts = len(self.running_accounts)
                    self.status.stopped_accounts = len(self.accounts) - len(self.running_accounts)
                    self.status.error_accounts = sum(1 for acc in self.accounts.values() if acc.status == "error")
                    self.status.last_update = datetime.now().isoformat()
                
                # 每30分钟更新一次账号信息
                for account in self.accounts.values():
                    if account.status == "running":
                        self._update_account_info(account)
                
                time.sleep(self.info_interval)
                
            except Exception as e:
                logger.error(f"状态更新循环错误: {e}")
                time.sleep(60)
    
    def get_status(self) -> Dict:
        """获取服务状态"""
        with self.lock:
            return {
                "is_running": self.is_running,
                "status": asdict(self.status),
                "accounts": {aid: asdict(acc) for aid, acc in self.accounts.items()},
                "running_accounts": list(self.running_accounts)
            }
    
    def get_logs(self, limit: int = 100) -> List[str]:
        """获取日志"""
        try:
            with open('mining_service.log', 'r', encoding='utf-8') as f:
                lines = f.readlines()
                return lines[-limit:] if len(lines) > limit else lines
        except Exception as e:
            logger.error(f"获取日志失败: {e}")
            return []

# 全局服务实例
mining_service = MiningService()

def main():
    """主函数"""
    logger.info("挂机挖矿服务启动")
    
    # 保持服务运行
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("挂机挖矿服务停止")
    except Exception as e:
        logger.error(f"服务运行错误: {e}")

if __name__ == "__main__":
    main()
