# -*- coding: utf-8 -*-
"""
StyleSwift 预设挂件数据查看脚本
展示数据库中的预设挂件详细信息
"""

import sys
import os
import json
from datetime import datetime

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db, Widget

def show_widget_details():
    """展示挂件详细信息"""
    with app.app_context():
        try:
            print("🎮 StyleSwift 预设挂件 Demo 数据展示")
            print("=" * 60)
            
            # 查询所有预设挂件
            widgets = Widget.query.filter(
                Widget.widget_id.in_(['catgirl', 'transformer', 'pokemon'])
            ).all()
            
            if not widgets:
                print("❌ 未找到预设挂件数据！请先运行 init_widget_demo.py")
                return
            
            print(f"✅ 找到 {len(widgets)} 个预设挂件\n")
            
            for i, widget in enumerate(widgets, 1):
                print(f"🔹 挂件 #{i}: {widget.name}")
                print(f"   Widget ID: {widget.widget_id}")
                print(f"   类型: {widget.widget_type}")
                print(f"   描述: {widget.description}")
                print(f"   创建时间: {widget.created_at}")
                print(f"   评分: {widget.average_rating:.1f} ({widget.total_ratings} 次评分)")
                
                # 显示代码长度
                print(f"   📊 代码统计:")
                print(f"      HTML: {len(widget.html_code)} 字符")
                print(f"      CSS:  {len(widget.css_code)} 字符")
                print(f"      JS:   {len(widget.js_code)} 字符")
                
                # 显示配置信息
                try:
                    config = json.loads(widget.default_config)
                    print(f"   ⚙️ 默认配置:")
                    print(f"      位置: x={config['position']['x']}, y={config['position']['y']}")
                    print(f"      尺寸: {config['size']['width']}x{config['size']['height']}")
                except:
                    print(f"   ⚙️ 配置: {widget.default_config}")
                
                print()
            
            print("🌟 挂件特色展示:")
            print("-" * 40)
            
            # 展示每个挂件的特色功能
            widget_features = {
                'catgirl': {
                    'emoji': '🐱',
                    'features': [
                        '🎭 动态表情动画',
                        '💬 日语对话切换 (5种消息)',
                        '🖱️ 点击互动响应',
                        '⏰ 5秒自动切换消息',
                        '💫 浮动和眨眼动画',
                        '🎨 粉色二次元配色'
                    ]
                },
                'transformer': {
                    'emoji': '🤖',
                    'features': [
                        '🔋 动态能量显示',
                        '🔄 点击变形动画',
                        '📊 科幻HUD界面',
                        '💫 绿色发光效果',
                        '⚡ 机器人姿态动画',
                        '🎮 赛博朋克风格'
                    ]
                },
                'pokemon': {
                    'emoji': '⚡',
                    'features': [
                        '🔊 皮卡丘叫声 (5种)',
                        '❤️ 动态血量条',
                        '📈 升级系统',
                        '⚡ 十万伏特特效',
                        '🎯 状态动画',
                        '🌟 宝可梦经典配色'
                    ]
                }
            }
            
            for widget in widgets:
                if widget.widget_id in widget_features:
                    feature_info = widget_features[widget.widget_id]
                    print(f"{feature_info['emoji']} {widget.name}:")
                    for feature in feature_info['features']:
                        print(f"   {feature}")
                    print()
            
            print("📋 API 使用示例:")
            print("-" * 40)
            print("# 获取挂件列表")
            print("GET /api/widgets")
            print()
            print("# 应用预设挂件")
            print("POST /api/apply_widget")
            print('{"widget_id": "catgirl"}')
            print()
            print("# 生成自定义挂件")
            print("POST /api/generate_ai_widget")
            print('{"description": "一个会跳舞的机器猫", "widgetId": "widget_12345"}')
            print()
            print("# 保存自定义代码")
            print("POST /api/save_custom_widget_code")
            print('{"html": "...", "css": "...", "js": "...", "widgetId": "widget_67890"}')
            
            print("\n🎯 技术实现亮点:")
            print("-" * 40)
            print("✨ Shadow DOM 完全封装 - 避免样式冲突")
            print("🖱️ 拖拽缩放功能 - 自由调整位置大小")
            print("⚙️ 丰富交互动画 - 提升用户体验")
            print("💾 状态自动保存 - 记住用户偏好")
            print("🔧 内置控制面板 - 关闭/最小化功能")
            print("🌐 全站统一应用 - 一次设置全局生效")
            print("🎨 AI 智能生成 - 支持自定义挂件创建")
            print("📊 评分系统支持 - 用户反馈机制")
            
            print(f"\n📁 demo页面: widget_demo.html")
            print(f"🚀 在浏览器中打开查看完整展示")
            
        except Exception as e:
            print(f"❌ 查看挂件数据失败: {str(e)}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    show_widget_details() 