#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CSP 合规性测试脚本
检查 content.js 是否完全避免了可能违反CSP的代码模式
"""

import re
import os

def check_csp_compliance():
    """检查CSP合规性"""
    print("🔐 CSP 合规性检查")
    print("=" * 60)
    
    # 读取content.js文件
    content_js_path = "content.js"
    if not os.path.exists(content_js_path):
        print("❌ content.js 文件不存在")
        return False
    
    with open(content_js_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 定义可能违反CSP的模式
    csp_violations = [
        # eval相关
        (r'\beval\s*\(', 'eval() 函数调用'),
        (r'new\s+Function\s*\(', 'Function 构造函数'),
        (r'setTimeout\s*\(\s*["\']', 'setTimeout 带字符串参数'),
        (r'setInterval\s*\(\s*["\']', 'setInterval 带字符串参数'),
        
        # 动态script标签
        (r'createElement\s*\(\s*["\']script["\']', '动态创建script标签'),
        (r'\.innerHTML\s*=.*<script', 'innerHTML 插入script'),
        
        # 动态事件处理器
        (r'\.setAttribute\s*\(\s*["\']on\w+["\']', '动态设置事件属性'),
        (r'document\.write\s*\(', 'document.write 调用'),
        
        # 其他危险模式
        (r'javascript:\s*', 'javascript: 协议'),
        (r'execScript\s*\(', 'execScript 调用'),
    ]
    
    violations_found = []
    
    print("1️⃣  检查潜在的CSP违规模式...")
    
    for pattern, description in csp_violations:
        matches = re.finditer(pattern, content, re.IGNORECASE)
        for match in matches:
            line_num = content[:match.start()].count('\n') + 1
            line_content = content.split('\n')[line_num - 1].strip()
            violations_found.append({
                'pattern': description,
                'line': line_num,
                'content': line_content
            })
    
    if violations_found:
        print(f"❌ 发现 {len(violations_found)} 个潜在的CSP违规:")
        for violation in violations_found:
            print(f"   行 {violation['line']}: {violation['pattern']}")
            print(f"   代码: {violation['content']}")
            print()
    else:
        print("✅ 未发现潜在的CSP违规模式")
    
    print("\n2️⃣  检查挂件JavaScript执行方法...")
    
    # 检查是否移除了危险的JavaScript执行方法
    dangerous_functions = [
        'executeWidgetJavaScriptSafely',
        'adaptJavaScriptForShadowDOM', 
        'createShadowDocumentAdapter',
        'addEventListenersFromCode',
        'addTimersFromCode',
        'addStyleAnimationsFromCode',
        'addAudioFromCode',
        'parseAndApplyBehaviorsFromJS'
    ]
    
    removed_functions = 0
    remaining_functions = []
    
    for func_name in dangerous_functions:
        if func_name in content:
            remaining_functions.append(func_name)
        else:
            removed_functions += 1
    
    print(f"✅ 已移除 {removed_functions} 个危险函数")
    
    if remaining_functions:
        print(f"❌ 仍存在 {len(remaining_functions)} 个危险函数:")
        for func in remaining_functions:
            print(f"   - {func}")
    else:
        print("✅ 所有危险的JavaScript执行函数已移除")
    
    print("\n3️⃣  检查新的安全实现...")
    
    # 检查安全的实现方法
    safe_patterns = [
        ('WIDGET_BEHAVIORS', '预定义挂件行为'),
        ('applyWidgetBehaviors', '安全挂件行为应用'),
        ('applyBehaviorsBasedOnContent', '基于内容的行为应用'),
        ('applyCatgirlBehaviors', '猫女挂件专用行为'),
        ('applyTransformerBehaviors', '变形金刚挂件专用行为'), 
        ('applyPokemonBehaviors', '宝可梦挂件专用行为'),
        ('applyUniversalBehaviors', '通用挂件行为')
    ]
    
    implemented_patterns = 0
    for pattern, description in safe_patterns:
        if pattern in content:
            implemented_patterns += 1
            print(f"✅ {description}")
        else:
            print(f"❌ 缺少: {description}")
    
    print(f"\n4️⃣  检查Web Audio API使用...")
    
    # 检查是否正确使用Web Audio API而不是动态代码
    audio_patterns = [
        'AudioContext',
        'createOscillator', 
        'createGain',
        'try.*catch.*音效'
    ]
    
    audio_implemented = 0
    for pattern in audio_patterns:
        if re.search(pattern, content, re.IGNORECASE):
            audio_implemented += 1
    
    if audio_implemented >= 3:
        print("✅ Web Audio API 安全实现已就位")
    else:
        print("❌ Web Audio API 实现不完整")
    
    print("\n" + "=" * 60)
    print("📋 CSP 合规性检查总结:")
    
    compliance_score = 0
    total_checks = 4
    
    if not violations_found:
        compliance_score += 1
        print("✅ 无CSP违规模式")
    else:
        print(f"❌ 发现 {len(violations_found)} 个CSP违规")
    
    if not remaining_functions:
        compliance_score += 1
        print("✅ 危险函数已完全移除")
    else:
        print(f"❌ 仍有 {len(remaining_functions)} 个危险函数")
    
    if implemented_patterns >= len(safe_patterns) * 0.8:
        compliance_score += 1
        print("✅ 安全实现模式充分")
    else:
        print("❌ 安全实现模式不足")
    
    if audio_implemented >= 3:
        compliance_score += 1
        print("✅ 音频实现安全")
    else:
        print("❌ 音频实现需要改进")
    
    compliance_percentage = (compliance_score / total_checks) * 100
    print(f"\n🎯 总体合规性: {compliance_percentage:.0f}% ({compliance_score}/{total_checks})")
    
    if compliance_percentage >= 100:
        print("🎉 完全符合CSP要求！")
        return True
    elif compliance_percentage >= 75:
        print("⚠️  基本符合CSP要求，但有改进空间")
        return True
    else:
        print("❌ CSP合规性不足，需要修复")
        return False

if __name__ == "__main__":
    success = check_csp_compliance()
    exit(0 if success else 1) 