#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Flask 路由测试脚本
"""

import requests
import json

# 测试API端点
def test_save_custom_widget_code():
    url = "http://127.0.0.1:5000/api/save_custom_widget_code"
    
    # 测试数据
    test_data = {
        "widgetId": "test-widget-123",
        "html": "<div class='test-widget'>测试挂件</div>",
        "css": ".test-widget { color: red; }",
        "js": "console.log('测试挂件');"
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        print("正在测试 /api/save_custom_widget_code 路由...")
        print(f"请求URL: {url}")
        print(f"请求数据: {json.dumps(test_data, indent=2, ensure_ascii=False)}")
        
        response = requests.post(url, json=test_data, headers=headers, timeout=10)
        
        print(f"响应状态码: {response.status_code}")
        print(f"响应头: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ 路由测试成功!")
            print(f"响应内容: {response.json()}")
        else:
            print("❌ 路由测试失败!")
            print(f"错误内容: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ 连接失败 - Flask 服务器可能没有运行")
        print("请确保 Flask 服务器正在 http://127.0.0.1:5000 上运行")
    except requests.exceptions.Timeout:
        print("❌ 请求超时")
    except Exception as e:
        print(f"❌ 测试过程中出现错误: {str(e)}")

def test_basic_connectivity():
    """测试基本连接性"""
    try:
        print("测试基本连接性...")
        response = requests.get("http://127.0.0.1:5000/", timeout=5)
        print(f"主页响应状态码: {response.status_code}")
        return True
    except Exception as e:
        print(f"基本连接测试失败: {str(e)}")
        return False

if __name__ == "__main__":
    print("=== Flask 路由测试开始 ===")
    
    if test_basic_connectivity():
        print("\n=== 测试自定义挂件代码保存路由 ===")
        test_save_custom_widget_code()
    else:
        print("请先启动 Flask 服务器!")
        print("运行命令: python app.py")
    
    print("\n=== 测试完成 ===") 