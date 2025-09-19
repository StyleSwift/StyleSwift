import requests
import json

def test_direct_connection():
    """直接测试Flask服务器连接"""
    base_url = "http://127.0.0.1:5000"  # 使用127.0.0.1而不是localhost
    
    print("🔗 测试Flask服务器直接连接")
    print("=" * 50)
    
    # 测试首页
    print("\n1. 测试首页...")
    try:
        response = requests.get(f"{base_url}/", timeout=5)
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            print("✅ 首页连接成功")
        else:
            print(f"❌ 首页响应异常: {response.text[:200]}")
    except Exception as e:
        print(f"❌ 首页连接失败: {e}")
        return False
    
    # 测试样式API（已知工作的API）
    print("\n2. 测试样式API...")
    try:
        response = requests.get(f"{base_url}/api/styles", timeout=5)
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            print("✅ 样式API工作正常")
        else:
            print(f"❌ 样式API异常: {response.text[:200]}")
    except Exception as e:
        print(f"❌ 样式API失败: {e}")
    
    # 测试挂件API
    print("\n3. 测试挂件API...")
    try:
        response = requests.get(f"{base_url}/api/widgets", timeout=5)
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            widgets = response.json()
            print(f"✅ 挂件API工作正常，找到 {len(widgets)} 个挂件")
            for widget in widgets[:3]:  # 只显示前3个
                print(f"   - {widget['name']} (ID: {widget['widget_id']})")
        else:
            print(f"❌ 挂件API异常: {response.text[:200]}")
    except Exception as e:
        print(f"❌ 挂件API失败: {e}")
    
    # 测试应用挂件
    print("\n4. 测试应用挂件...")
    try:
        data = {"widget_id": "catgirl"}
        response = requests.post(
            f"{base_url}/api/apply_widget",
            headers={"Content-Type": "application/json"},
            json=data,
            timeout=5
        )
        print(f"状态码: {response.status_code}")
        if response.status_code == 200:
            result = response.json()
            print("✅ 挂件应用成功")
            print(f"   Widget ID: {result.get('widget_id')}")
            print(f"   HTML长度: {len(result.get('html_code', ''))}")
            print(f"   CSS长度: {len(result.get('css_code', ''))}")
            print(f"   JS长度: {len(result.get('js_code', ''))}")
        else:
            print(f"❌ 挂件应用失败: {response.text[:200]}")
    except Exception as e:
        print(f"❌ 挂件应用请求失败: {e}")

if __name__ == "__main__":
    test_direct_connection() 