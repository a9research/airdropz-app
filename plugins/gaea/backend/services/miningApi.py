#!/usr/bin/env python3
"""
挂机挖矿API接口
提供HTTP API来控制Python挖矿服务
"""

import json
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from miningService import mining_service

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

@app.route('/api/mining/status', methods=['GET'])
def get_status():
    """获取挖矿状态"""
    try:
        status = mining_service.get_status()
        return jsonify({
            "success": True,
            "data": status
        })
    except Exception as e:
        logger.error(f"获取状态失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/mining/accounts', methods=['GET'])
def get_accounts():
    """获取所有账号"""
    try:
        status = mining_service.get_status()
        return jsonify({
            "success": True,
            "data": status["accounts"]
        })
    except Exception as e:
        logger.error(f"获取账号失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/mining/accounts', methods=['POST'])
def add_account():
    """添加账号"""
    try:
        data = request.get_json()
        if not data or not all(k in data for k in ['id', 'name', 'uid', 'token']):
            return jsonify({
                "success": False,
                "error": "缺少必要参数"
            }), 400
        
        success = mining_service.add_account(data)
        if success:
            return jsonify({
                "success": True,
                "message": "账号添加成功"
            })
        else:
            return jsonify({
                "success": False,
                "error": "账号添加失败"
            }), 500
    except Exception as e:
        logger.error(f"添加账号失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/mining/sync-accounts', methods=['POST'])
def sync_accounts():
    """同步账号数据"""
    try:
        data = request.get_json()
        if not data or 'accounts' not in data:
            return jsonify({
                "success": False,
                "error": "缺少账号数据"
            }), 400
        
        count = mining_service.sync_accounts_from_database(data['accounts'])
        return jsonify({
            "success": True,
            "message": f"同步 {count} 个账号",
            "count": count
        })
    except Exception as e:
        logger.error(f"同步账号失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/mining/accounts/<account_id>', methods=['DELETE'])
def remove_account(account_id):
    """移除账号"""
    try:
        success = mining_service.remove_account(account_id)
        if success:
            return jsonify({
                "success": True,
                "message": "账号移除成功"
            })
        else:
            return jsonify({
                "success": False,
                "error": "账号不存在"
            }), 404
    except Exception as e:
        logger.error(f"移除账号失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/mining/start/<account_id>', methods=['POST'])
def start_account(account_id):
    """开始单个账号挖矿"""
    try:
        success = mining_service.start_account(account_id)
        if success:
            return jsonify({
                "success": True,
                "message": "账号挖矿开始"
            })
        else:
            return jsonify({
                "success": False,
                "error": "账号不存在或已在运行"
            }), 400
    except Exception as e:
        logger.error(f"开始账号挖矿失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/mining/stop/<account_id>', methods=['POST'])
def stop_account(account_id):
    """停止单个账号挖矿"""
    try:
        success = mining_service.stop_account(account_id)
        if success:
            return jsonify({
                "success": True,
                "message": "账号挖矿停止"
            })
        else:
            return jsonify({
                "success": False,
                "error": "账号不存在或未在运行"
            }), 400
    except Exception as e:
        logger.error(f"停止账号挖矿失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/mining/start-all', methods=['POST'])
def start_all_accounts():
    """开始所有账号挖矿"""
    try:
        count = mining_service.start_all_accounts()
        return jsonify({
            "success": True,
            "message": f"开始 {count} 个账号挖矿",
            "count": count
        })
    except Exception as e:
        logger.error(f"开始所有账号挖矿失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/mining/stop-all', methods=['POST'])
def stop_all_accounts():
    """停止所有账号挖矿"""
    try:
        count = mining_service.stop_all_accounts()
        return jsonify({
            "success": True,
            "message": f"停止 {count} 个账号挖矿",
            "count": count
        })
    except Exception as e:
        logger.error(f"停止所有账号挖矿失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/mining/logs', methods=['GET'])
def get_logs():
    """获取日志"""
    try:
        limit = request.args.get('limit', 100, type=int)
        logs = mining_service.get_logs(limit)
        return jsonify({
            "success": True,
            "data": logs
        })
    except Exception as e:
        logger.error(f"获取日志失败: {e}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
