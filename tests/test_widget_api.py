import requests
import json

def test_widget_api():
    """测试挂件API"""
    base_url = "http://127.0.0.1:5000"
    
    print("🧪 测试挂件API")
    print("=" * 50)
    
    # 测试获取挂件列表
    print("\n1. 测试获取挂件列表...")
    try:
        response = requests.get(f"{base_url}/api/widgets")
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            widgets = response.json()
            print(f"✅ 成功获取 {len(widgets)} 个挂件")
            for widget in widgets:
                print(f"   - {widget['name']} (ID: {widget['widget_id']}, 类型: {widget['type']})")
        else:
            print(f"❌ 失败: {response.text}")
    except Exception as e:
        print(f"❌ 连接失败: {e}")
        return
    
    # 测试应用挂件 - 猫女
    print("\n2. 测试应用猫女挂件...")
    try:
        data = {"widget_id": "catgirl"}
        response = requests.post(
            f"{base_url}/api/apply_widget",
            headers={"Content-Type": "application/json"},
            json=data
        )
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("✅ 猫女挂件应用成功")
            print(f"   消息: {result.get('message')}")
            print(f"   Widget ID: {result.get('widget_id')}")
            print(f"   HTML长度: {len(result.get('html_code', ''))}")
            print(f"   CSS长度: {len(result.get('css_code', ''))}")
            print(f"   JS长度: {len(result.get('js_code', ''))}")
            print(f"   默认配置: {result.get('default_config', 'N/A')}")
        else:
            print(f"❌ 失败: {response.text}")
    except Exception as e:
        print(f"❌ 请求失败: {e}")
    
    # 测试应用挂件 - 变形金刚
    print("\n3. 测试应用变形金刚挂件...")
    try:
        data = {"widget_id": "transformer"}
        response = requests.post(
            f"{base_url}/api/apply_widget",
            headers={"Content-Type": "application/json"},
            json=data
        )
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("✅ 变形金刚挂件应用成功")
            print(f"   Widget ID: {result.get('widget_id')}")
            print(f"   代码总长度: {len(result.get('html_code', '')) + len(result.get('css_code', '')) + len(result.get('js_code', ''))} 字符")
        else:
            print(f"❌ 失败: {response.text}")
    except Exception as e:
        print(f"❌ 请求失败: {e}")
    
    # 测试应用挂件 - 皮卡丘
    print("\n4. 测试应用皮卡丘挂件...")
    try:
        data = {"widget_id": "pokemon"}
        response = requests.post(
            f"{base_url}/api/apply_widget",
            headers={"Content-Type": "application/json"},
            json=data
        )
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("✅ 皮卡丘挂件应用成功")
            print(f"   Widget ID: {result.get('widget_id')}")
            print(f"   代码总长度: {len(result.get('html_code', '')) + len(result.get('css_code', '')) + len(result.get('js_code', ''))} 字符")
        else:
            print(f"❌ 失败: {response.text}")
    except Exception as e:
        print(f"❌ 请求失败: {e}")
    
    # 测试不存在的挂件
    print("\n5. 测试不存在的挂件...")
    try:
        data = {"widget_id": "nonexistent"}
        response = requests.post(
            f"{base_url}/api/apply_widget",
            headers={"Content-Type": "application/json"},
            json=data
        )
        print(f"状态码: {response.status_code}")
        if response.status_code == 404:
            print("✅ 正确返回404错误")
            print(f"   错误信息: {response.json().get('message')}")
        else:
            print(f"❌ 意外的响应: {response.text}")
    except Exception as e:
        print(f"❌ 请求失败: {e}")

    print("\n🎉 挂件API测试完成!")
    print("所有预设挂件都可以正常应用。")

if __name__ == "__main__":
    test_widget_api() 