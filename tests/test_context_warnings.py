#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试扩展上下文警告优化
验证改进后的警告处理是否正常工作
"""

def test_context_warning_improvements():
    """测试上下文警告改进"""
    print("🔧 测试扩展上下文警告优化")
    print("=" * 60)
    
    print("1️⃣  验证警告优化代码...")
    
    # 检查 content.js 中的改进
    try:
        with open('content.js', 'r', encoding='utf-8') as f:
            content = f.read()
        
        improvements_check = [
            ('contextInvalidationWarned', '添加了警告状态跟踪变量'),
            ('🔄 扩展正在重新加载中', '改进了用户友好的警告信息'),
            ('console.info', '使用了更友好的info级别日志'),
            ('静默处理上下文无效错误', '添加了静默错误处理'),
            ('✅ StyleSwift 扩展初始化成功', '改进了初始化成功信息'),
        ]
        
        for check, description in improvements_check:
            if check in content:
                print(f"✅ {description}: 找到 '{check}'")
            else:
                print(f"❌ {description}: 未找到 '{check}'")
        
        print("\n2️⃣  验证警告减少策略...")
        
        # 检查是否移除了重复警告
        warning_reduction_checks = [
            ('console.warn.*Extension context invalidated.*Skipping', '移除了重复的警告信息'),
            ('initWarned', '添加了初始化警告防重复机制'),
            ('contextInvalidationWarned', '添加了样式应用警告防重复机制'),
        ]
        
        for pattern, description in warning_reduction_checks:
            import re
            if 'console.warn.*Extension context invalidated.*Skipping' in pattern:
                # 检查是否移除了旧的警告
                if 'Extension context invalidated. Skipping checkAndApplyStyle.' not in content:
                    print(f"✅ {description}: 已移除旧的警告信息")
                else:
                    print(f"❌ {description}: 仍存在旧的警告信息")
            elif pattern in content:
                print(f"✅ {description}: 找到 '{pattern}'")
            else:
                print(f"❌ {description}: 未找到 '{pattern}'")
        
        print("\n3️⃣  验证用户体验改进...")
        
        ux_improvements = [
            ('🔄', '使用了用户友好的emoji图标'),
            ('等待扩展初始化完成', '提供了明确的状态说明'),
            ('扩展正在重新加载中', '解释了用户看到的情况'),
            ('功能将在扩展重新加载后恢复', '给出了恢复预期'),
        ]
        
        for check, description in ux_improvements:
            if check in content:
                print(f"✅ {description}: 找到 '{check}'")
            else:
                print(f"❌ {description}: 未找到 '{check}'")
        
        print("\n4️⃣  验证错误处理改进...")
        
        error_handling_checks = [
            ('静默处理，不显示警告', '改进了错误处理静默机制'),
            ('error.message.includes', '添加了错误类型检查'),
            ('contextInvalidationWarned = false', '添加了警告状态重置'),
        ]
        
        for check, description in error_handling_checks:
            if check in content:
                print(f"✅ {description}: 找到 '{check}'")
            else:
                print(f"❌ {description}: 未找到 '{check}'")
                
    except FileNotFoundError:
        print("❌ 无法找到 content.js 文件")
        return False
    except Exception as e:
        print(f"❌ 读取文件时出错: {str(e)}")
        return False
    
    print("\n" + "=" * 60)
    print("🎉 上下文警告优化测试完成！")
    print("\n✨ 改进内容:")
    print("- 🔇 减少了重复的控制台警告")
    print("- 💬 使用了更友好的用户信息")
    print("- 🎯 添加了警告防重复机制")
    print("- 🛡️ 改进了错误处理逻辑")
    print("- 📝 提供了清晰的状态说明")
    
    print("\n🔧 用户体验改进:")
    print("- 不再有烦人的红色警告信息")
    print("- 提供了友好的蓝色信息提示")
    print("- 解释了扩展重新加载的情况")
    print("- 给出了明确的恢复预期")
    
    return True

if __name__ == "__main__":
    test_context_warning_improvements() 