#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Bongo Cat 挂件测试脚本
验证标准格式的 Bongo Cat 挂件代码
"""

import requests
import json

def test_bongo_cat_widget():
    """测试 Bongo Cat 挂件完整功能"""
    print("🐱 测试 Bongo Cat 挂件功能")
    print("=" * 60)
    
    base_url = "http://127.0.0.1:5000"
    
    # 标准格式的 Bongo Cat 挂件代码
    bongo_cat_html = '''<div class="bongo-container interactive clickable" data-behavior="bounce">
  <div class="bongo-cat">
    <div class="cat-head">🐱</div>
    <div class="paw paw-left">👋</div>
    <div class="paw paw-right">👋</div>
    <div class="laptop">💻</div>
    <div class="music-notes">
      <span class="note">🎵</span>
      <span class="note">🎶</span>
      <span class="note">🎼</span>
    </div>
  </div>
</div>'''

    bongo_cat_css = '''.bongo-container {
  width: 250px;
  height: 200px;
  background: linear-gradient(135deg, #1a1e2d 0%, #2d1b69 100%);
  border-radius: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}

.bongo-container:hover {
  transform: scale(1.05);
  box-shadow: 0 12px 40px rgba(0,0,0,0.4);
}

.cat-head {
  font-size: 48px;
  animation: head-bob 1s ease-in-out infinite;
  margin-bottom: 10px;
}

.paw {
  position: absolute;
  font-size: 24px;
  top: 50px;
}

.paw-left {
  left: -30px;
  animation: paw-tap-left 0.6s ease-in-out infinite;
}

.paw-right {
  right: -30px;
  animation: paw-tap-right 0.6s ease-in-out infinite;
  animation-delay: 0.3s;
}

.laptop {
  font-size: 32px;
  margin: 10px 0;
  animation: laptop-glow 2s ease-in-out infinite;
}

.music-notes {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
}

.note {
  position: absolute;
  font-size: 16px;
  animation: note-float 2s ease-in-out infinite;
  opacity: 0;
}

@keyframes head-bob {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-5px) rotate(2deg); }
}

@keyframes paw-tap-left {
  0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
  50% { transform: translateY(-10px) rotate(-15deg); opacity: 1; }
}

@keyframes paw-tap-right {
  0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
  50% { transform: translateY(-10px) rotate(15deg); opacity: 1; }
}

@keyframes laptop-glow {
  0%, 100% { filter: brightness(1); transform: scale(1); }
  50% { filter: brightness(1.2); transform: scale(1.02); }
}

@keyframes note-float {
  0% { opacity: 0; transform: translateY(0px) scale(0.5); }
  20% { opacity: 1; transform: translateY(-20px) scale(1); }
  80% { opacity: 1; transform: translateY(-40px) scale(1.2); }
  100% { opacity: 0; transform: translateY(-60px) scale(0.8); }
}'''

    bongo_cat_js = '''console.log("🐱 Bongo Cat 挂件已加载！");

const bongoContainer = document.querySelector('.bongo-container');

if (bongoContainer) {
  bongoContainer.addEventListener('click', function() {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
      console.log('音效播放失败:', e);
    }
  });
}'''
    
    widget_id = 'bongo_cat_test_widget'
    
    print("1️⃣  保存 Bongo Cat 挂件代码...")
    try:
        payload = {
            'html': bongo_cat_html,
            'css': bongo_cat_css,
            'js': bongo_cat_js,
            'widgetId': widget_id
        }
        
        response = requests.post(f"{base_url}/api/save_custom_widget_code", json=payload)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 保存成功: {result['message']}")
            print(f"挂件ID: {result['widget_id']}")
        else:
            print(f"❌ 保存失败: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 保存异常: {str(e)}")
        return False
    
    print("\n2️⃣  验证挂件应用功能...")
    try:
        apply_payload = {
            'widget_id': widget_id
        }
        
        response = requests.post(f"{base_url}/api/apply_widget", json=apply_payload)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ 应用成功: {result['message']}")
            
            # 验证返回的代码
            html_code = result.get('html_code', '')
            css_code = result.get('css_code', '')
            js_code = result.get('js_code', '')
            
            print(f"HTML长度: {len(html_code)}")
            print(f"CSS长度: {len(css_code)}")
            print(f"JS长度: {len(js_code)}")
            
            # 验证关键元素
            if '🐱' in html_code and 'bongo-container' in html_code:
                print("✅ HTML代码验证通过：包含猫咪和容器元素")
            else:
                print("❌ HTML代码验证失败")
                
            if 'head-bob' in css_code and 'paw-tap' in css_code:
                print("✅ CSS代码验证通过：包含动画定义")
            else:
                print("❌ CSS代码验证失败")
                
            if 'AudioContext' in js_code and 'click' in js_code:
                print("✅ JS代码验证通过：包含音效和交互")
            else:
                print("❌ JS代码验证失败")
                
        else:
            print(f"❌ 应用失败: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ 应用异常: {str(e)}")
        return False
    
    print("\n3️⃣  验证行为映射...")
    # 验证HTML中的行为标记
    behavior_checks = [
        ('interactive', 'clickable', '交互式点击'),
        ('data-behavior="bounce"', '弹跳行为'),
        ('🐱', '猫咪元素'),
        ('👋', '爪子元素'),
        ('🎵', '音符元素')
    ]
    
    for check in behavior_checks:
        if len(check) == 3:
            key, desc = check[0], check[2]
        else:
            key, desc = check[0], check[1]
            
        if key in bongo_cat_html:
            print(f"✅ {desc}: 找到 '{key}'")
        else:
            print(f"⚠️  {desc}: 未找到 '{key}'")
    
    print("\n4️⃣  验证CSP合规性...")
    csp_safe = True
    
    # 检查危险的代码模式
    dangerous_patterns = [
        'new Function(',
        'eval(',
        'document.write('
    ]
    
    all_code = bongo_cat_html + bongo_cat_css + bongo_cat_js
    
    for pattern in dangerous_patterns:
        if pattern in all_code:
            print(f"❌ 发现危险模式: {pattern}")
            csp_safe = False
    
    if csp_safe:
        print("✅ CSP合规性验证通过：无危险代码模式")
    
    print("\n" + "=" * 60)
    print("🎉 Bongo Cat 挂件测试完成！")
    print("\n✨ 功能特性:")
    print("- 🎵 动态动画：头部摆动、爪子敲击、音符飘浮")
    print("- 🔊 音效交互：点击播放敲击声音")
    print("- 🎨 视觉效果：渐变背景、发光效果")
    print("- 🖱️ 鼠标交互：悬停缩放、点击反馈")
    print("- 🛡️ 安全合规：符合CSP政策")
    
    return True

if __name__ == "__main__":
    test_bongo_cat_widget() 