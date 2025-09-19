#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
自定义挂件功能测试脚本
检查自定义代码挂件保存和应用功能
"""

import requests
import json

def test_custom_widget():
    """测试自定义挂件功能"""
    print("🔧 自定义挂件功能测试")
    print("=" * 50)
    
    base_url = "http://127.0.0.1:5000"
    
    # 创建测试用的自定义挂件代码
    test_payload = {
        'html': '<div class="custom-widget interactive clickable" data-behavior="bounce">🎯 点击我测试</div>',
        'css': '.custom-widget { background: linear-gradient(45deg, #ff6b6b, #4ecdc4); color: white; padding: 20px; border-radius: 10px; text-align: center; cursor: pointer; transition: all 0.3s ease; }',
        'js': '// 自定义JavaScript代码（现在由预定义行为处理）\nconsole.log("自定义挂件加载完成");',
        'widgetId': 'test_custom_widget_debug'
    }
    
    print("1️⃣  测试保存自定义挂件代码...")
    try:
        response = requests.post(f"{base_url}/api/save_custom_widget_code", json=test_payload)
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 保存成功: {result.get('message', '')}")
            print(f"挂件ID: {result.get('widget_id', '')}")
        else:
            print(f"❌ 保存失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 保存请求失败: {e}")
        return False
    
    print("\n2️⃣  验证挂件是否已保存...")
    try:
        response = requests.get(f"{base_url}/api/widgets")
        if response.status_code == 200:
            widgets = response.json()
            custom_widget = None
            for widget in widgets:
                if widget.get('widget_id') == 'test_custom_widget_debug':
                    custom_widget = widget
                    break
            
            if custom_widget:
                print(f"✅ 找到自定义挂件: {custom_widget['name']}")
                print(f"类型: {custom_widget['type']}")
            else:
                print("❌ 未找到刚保存的自定义挂件")
                return False
        else:
            print(f"❌ 获取挂件列表失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ 获取挂件列表失败: {e}")
        return False
    
    print("\n3️⃣  测试应用自定义挂件...")
    try:
        apply_payload = {'widget_id': 'test_custom_widget_debug'}
        response = requests.post(f"{base_url}/api/apply_widget", json=apply_payload)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 应用成功: {data.get('message', '')}")
            print(f"HTML代码长度: {len(data.get('html_code', ''))}")
            print(f"CSS代码长度: {len(data.get('css_code', ''))}")
            print(f"JS代码长度: {len(data.get('js_code', ''))}")
            print(f"挂件ID: {data.get('widget_id', '')}")
            
            # 显示实际内容
            print(f"\nHTML内容: {data.get('html_code', '')[:100]}...")
            print(f"CSS内容: {data.get('css_code', '')[:100]}...")
            
            return True
        else:
            print(f"❌ 应用失败: {response.text}")
            return False
    except Exception as e:
        print(f"❌ 应用请求失败: {e}")
        return False

def test_existing_custom_widgets():
    """测试现有的自定义挂件"""
    print("\n4️⃣  检查现有自定义挂件...")
    
    try:
        response = requests.get("http://127.0.0.1:5000/api/widgets")
        if response.status_code == 200:
            widgets = response.json()
            custom_widgets = [w for w in widgets if w.get('type') in ['custom', 'custom-code']]
            
            print(f"找到 {len(custom_widgets)} 个自定义挂件:")
            for widget in custom_widgets:
                print(f"- {widget['name']} (ID: {widget['widget_id']}, 类型: {widget['type']})")
                
                # 测试应用这个挂件
                apply_payload = {'widget_id': widget['widget_id']}
                response = requests.post("http://127.0.0.1:5000/api/apply_widget", json=apply_payload)
                if response.status_code == 200:
                    print(f"  ✅ 可以正常应用")
                else:
                    print(f"  ❌ 应用失败: {response.status_code}")
        else:
            print(f"❌ 获取挂件列表失败: {response.status_code}")
    except Exception as e:
        print(f"❌ 检查现有挂件失败: {e}")

if __name__ == "__main__":
    success = test_custom_widget()
    test_existing_custom_widgets()
    
    if success:
        print("\n🎉 自定义挂件功能正常！")
        print("\n💡 如果前端仍无反应，可能的原因:")
        print("1. 前端没有正确调用后端API")
        print("2. 浏览器扩展上下文问题")
        print("3. 前端JavaScript错误")
        print("4. 挂件容器创建问题")
    else:
        print("\n❌ 自定义挂件功能有问题，需要修复！") 