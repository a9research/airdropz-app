import sys
import json
import random

proxies = [
    {"host": "dc.decodo.com", "port": 10002, "auth": "spjhlgf4k6:wL15YzFee=u5Ggts5o"},
    {"host": "dc.decodo.com", "port": 10003, "auth": "spjhlgf4k6:wL15YzFee=u5Ggts5o"}
]

for line in sys.stdin:
    if line.strip() == "get_next_proxy":
        proxy = random.choice(proxies)
        print(json.dumps(proxy))  # 输出 JSON 格式的代理
        sys.stdout.flush()  # 确保立即输出