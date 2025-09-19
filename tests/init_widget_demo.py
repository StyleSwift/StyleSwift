# -*- coding: utf-8 -*-
"""
StyleSwift 预设挂件 Demo 数据初始化脚本
为数据库添加三个预设挂件示例：catgirl、transformer、pokemon
"""

import sys
import os
import json
from datetime import datetime

# 添加项目根目录到Python路径
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import app, db, Widget

def create_catgirl_widget():
    """创建猫女挂件Demo"""
    html_code = '''
    <div class="catgirl-container">
        <div class="catgirl-character">
            <div class="catgirl-head">
                <div class="catgirl-ears">
                    <div class="ear left"></div>
                    <div class="ear right"></div>
                </div>
                <div class="catgirl-face">
                    <div class="eyes">
                        <div class="eye left"></div>
                        <div class="eye right"></div>
                    </div>
                    <div class="nose"></div>
                    <div class="mouth"></div>
                    <div class="whiskers">
                        <div class="whisker left-1"></div>
                        <div class="whisker left-2"></div>
                        <div class="whisker right-1"></div>
                        <div class="whisker right-2"></div>
                    </div>
                </div>
            </div>
            <div class="catgirl-body">
                <div class="catgirl-message">
                    <span id="catgirl-text">こんにちは！ニャ～</span>
                </div>
            </div>
            <div class="catgirl-tail"></div>
        </div>
    </div>
    '''
    
    css_code = '''
    .catgirl-container {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(45deg, #FFB6C1, #FFC0CB);
        position: relative;
        overflow: hidden;
    }
    
    .catgirl-character {
        position: relative;
        animation: float 3s ease-in-out infinite;
    }
    
    .catgirl-head {
        width: 80px;
        height: 80px;
        background: #FFE4E1;
        border-radius: 50%;
        position: relative;
        border: 2px solid #FF69B4;
    }
    
    .catgirl-ears {
        position: absolute;
        top: -20px;
        left: 50%;
        transform: translateX(-50%);
        width: 100%;
    }
    
    .ear {
        width: 20px;
        height: 25px;
        background: #FFE4E1;
        border: 2px solid #FF69B4;
        border-radius: 50% 50% 0 0;
        position: absolute;
    }
    
    .ear.left { left: 20px; transform: rotate(-30deg); }
    .ear.right { right: 20px; transform: rotate(30deg); }
    
    .ear::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 50%;
        transform: translateX(-50%);
        width: 10px;
        height: 15px;
        background: #FF69B4;
        border-radius: 50% 50% 0 0;
    }
    
    .catgirl-face {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 60px;
        height: 60px;
    }
    
    .eyes {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        padding: 0 15px;
    }
    
    .eye {
        width: 8px;
        height: 8px;
        background: #000;
        border-radius: 50%;
        animation: blink 4s infinite;
    }
    
    .nose {
        width: 6px;
        height: 6px;
        background: #FF69B4;
        border-radius: 50%;
        margin: 0 auto 5px;
    }
    
    .mouth {
        width: 12px;
        height: 6px;
        border: 2px solid #FF69B4;
        border-top: none;
        border-radius: 0 0 50px 50px;
        margin: 0 auto;
    }
    
    .whiskers {
        position: absolute;
        top: 20px;
        left: 0;
        right: 0;
    }
    
    .whisker {
        width: 15px;
        height: 1px;
        background: #666;
        position: absolute;
    }
    
    .whisker.left-1 { left: -8px; top: 0; }
    .whisker.left-2 { left: -6px; top: 5px; }
    .whisker.right-1 { right: -8px; top: 0; }
    .whisker.right-2 { right: -6px; top: 5px; }
    
    .catgirl-body {
        margin-top: 10px;
        text-align: center;
    }
    
    .catgirl-message {
        background: rgba(255, 255, 255, 0.9);
        padding: 8px 12px;
        border-radius: 15px;
        border: 2px solid #FF69B4;
        display: inline-block;
        font-size: 12px;
        font-weight: bold;
        color: #FF69B4;
        animation: bounce 2s infinite;
    }
    
    .catgirl-tail {
        position: absolute;
        right: -25px;
        top: 50%;
        width: 30px;
        height: 8px;
        background: #FFE4E1;
        border: 2px solid #FF69B4;
        border-radius: 20px;
        transform: rotate(45deg);
        animation: wagTail 1.5s ease-in-out infinite;
    }
    
    @keyframes float {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-10px); }
    }
    
    @keyframes blink {
        0%, 90%, 100% { transform: scaleY(1); }
        95% { transform: scaleY(0.1); }
    }
    
    @keyframes bounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
    }
    
    @keyframes wagTail {
        0%, 100% { transform: rotate(45deg); }
        50% { transform: rotate(25deg); }
    }
    '''
    
    js_code = '''
    // 猫女挂件交互功能
    const messages = [
        "こんにちは！ニャ～",
        "今日も頑張ってニャ！",
        "お疲れ様ニャ～",
        "一緒に遊ぼうニャ！",
        "ありがとうニャ～♡"
    ];
    
    let messageIndex = 0;
    
    function changeCatgirlMessage() {
        const textElement = document.getElementById('catgirl-text');
        if (textElement) {
            messageIndex = (messageIndex + 1) % messages.length;
            textElement.textContent = messages[messageIndex];
        }
    }
    
    // 每5秒切换一次消息
    setInterval(changeCatgirlMessage, 5000);
    
    // 点击时切换消息
    const container = document.querySelector('.catgirl-container');
    if (container) {
        container.addEventListener('click', changeCatgirlMessage);
    }
    '''
    
    return {
        'widget_id': 'catgirl',
        'name': '可爱猫女',
        'description': '一个可爱的二次元猫女角色，会定期切换日语消息，点击可互动',
        'widget_type': 'catgirl',
        'html_code': html_code,
        'css_code': css_code,
        'js_code': js_code,
        'preview_image_url': '/static/images/catgirl_preview.png',
        'default_config': json.dumps({
            "position": {"x": 20, "y": 100},
            "size": {"width": 200, "height": 250}
        })
    }

def create_transformer_widget():
    """创建变形金刚挂件Demo"""
    html_code = '''
    <div class="transformer-container">
        <div class="transformer-robot" id="transformer">
            <div class="transformer-head">
                <div class="transformer-helmet">
                    <div class="helmet-crest"></div>
                    <div class="face-mask">
                        <div class="eyes">
                            <div class="eye left"></div>
                            <div class="eye right"></div>
                        </div>
                        <div class="mouth-grille">
                            <div class="grille-line"></div>
                            <div class="grille-line"></div>
                            <div class="grille-line"></div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="transformer-body">
                <div class="chest-plate">
                    <div class="autobot-symbol">⚡</div>
                </div>
                <div class="arms">
                    <div class="arm left"></div>
                    <div class="arm right"></div>
                </div>
            </div>
            <div class="transformer-legs">
                <div class="leg left"></div>
                <div class="leg right"></div>
            </div>
        </div>
        <div class="transformer-hud">
            <div class="hud-line">STATUS: ONLINE</div>
            <div class="hud-line">POWER: <span id="power-level">100%</span></div>
            <div class="hud-line">MODE: <span id="robot-mode">ROBOT</span></div>
        </div>
    </div>
    '''
    
    css_code = '''
    .transformer-container {
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        color: #00ff41;
        font-family: 'Courier New', monospace;
    }
    
    .transformer-robot {
        position: relative;
        animation: robotPower 3s ease-in-out infinite;
        filter: drop-shadow(0 0 10px #00ff41);
    }
    
    .transformer-head {
        width: 60px;
        height: 50px;
        position: relative;
        margin-bottom: 5px;
    }
    
    .transformer-helmet {
        width: 100%;
        height: 100%;
        background: linear-gradient(145deg, #4a5568, #2d3748);
        border-radius: 10px 10px 5px 5px;
        position: relative;
        border: 2px solid #00ff41;
    }
    
    .helmet-crest {
        position: absolute;
        top: -8px;
        left: 50%;
        transform: translateX(-50%);
        width: 20px;
        height: 15px;
        background: #00ff41;
        clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
    }
    
    .face-mask {
        position: absolute;
        top: 15px;
        left: 50%;
        transform: translateX(-50%);
        width: 40px;
        height: 30px;
    }
    
    .eyes {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        padding: 0 8px;
    }
    
    .eye {
        width: 8px;
        height: 6px;
        background: #00ff41;
        border-radius: 2px;
        animation: eyeGlow 2s ease-in-out infinite;
    }
    
    .mouth-grille {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 0 10px;
    }
    
    .grille-line {
        height: 2px;
        background: #00ff41;
        border-radius: 1px;
    }
    
    .transformer-body {
        width: 80px;
        height: 80px;
        background: linear-gradient(145deg, #4a5568, #2d3748);
        border: 2px solid #00ff41;
        border-radius: 8px;
        position: relative;
        margin-bottom: 5px;
    }
    
    .chest-plate {
        position: absolute;
        top: 10px;
        left: 50%;
        transform: translateX(-50%);
        width: 50px;
        height: 40px;
        background: linear-gradient(145deg, #2d3748, #1a202c);
        border: 1px solid #00ff41;
        border-radius: 5px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .autobot-symbol {
        font-size: 20px;
        color: #00ff41;
        animation: symbolPulse 2s ease-in-out infinite;
    }
    
    .arms {
        position: absolute;
        top: 20px;
        width: 100%;
        height: 40px;
    }
    
    .arm {
        position: absolute;
        width: 15px;
        height: 40px;
        background: linear-gradient(145deg, #4a5568, #2d3748);
        border: 1px solid #00ff41;
        border-radius: 5px;
    }
    
    .arm.left { left: -18px; }
    .arm.right { right: -18px; }
    
    .transformer-legs {
        display: flex;
        gap: 10px;
    }
    
    .leg {
        width: 20px;
        height: 50px;
        background: linear-gradient(145deg, #4a5568, #2d3748);
        border: 2px solid #00ff41;
        border-radius: 5px;
    }
    
    .transformer-hud {
        position: absolute;
        bottom: 10px;
        left: 10px;
        right: 10px;
        background: rgba(0, 0, 0, 0.8);
        border: 1px solid #00ff41;
        border-radius: 5px;
        padding: 5px;
        font-size: 10px;
    }
    
    .hud-line {
        margin: 2px 0;
        text-shadow: 0 0 5px #00ff41;
    }
    
    @keyframes robotPower {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-5px); }
    }
    
    @keyframes eyeGlow {
        0%, 100% { box-shadow: 0 0 5px #00ff41; }
        50% { box-shadow: 0 0 15px #00ff41, 0 0 25px #00ff41; }
    }
    
    @keyframes symbolPulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.2); }
    }
    '''
    
    js_code = '''
    // 变形金刚挂件交互功能
    let powerLevel = 100;
    let isTransformed = false;
    
    function updatePowerLevel() {
        const powerElement = document.getElementById('power-level');
        if (powerElement) {
            powerLevel = Math.max(0, powerLevel - 1);
            if (powerLevel === 0) powerLevel = 100;
            powerElement.textContent = powerLevel + '%';
        }
    }
    
    function transformRobot() {
        const robot = document.getElementById('transformer');
        const modeElement = document.getElementById('robot-mode');
        
        if (robot && modeElement) {
            isTransformed = !isTransformed;
            
            if (isTransformed) {
                robot.style.transform = 'scale(0.8) rotateY(180deg)';
                modeElement.textContent = 'VEHICLE';
            } else {
                robot.style.transform = 'scale(1) rotateY(0deg)';
                modeElement.textContent = 'ROBOT';
            }
        }
    }
    
    // 每3秒更新能量等级
    setInterval(updatePowerLevel, 3000);
    
    // 点击变形
    const container = document.querySelector('.transformer-container');
    if (container) {
        container.addEventListener('click', transformRobot);
    }
    '''
    
    return {
        'widget_id': 'transformer',
        'name': '变形金刚',
        'description': '科幻风格的变形金刚机器人，带有HUD界面，点击可变形',
        'widget_type': 'transformer',
        'html_code': html_code,
        'css_code': css_code,
        'js_code': js_code,
        'preview_image_url': '/static/images/transformer_preview.png',
        'default_config': json.dumps({
            "position": {"x": 250, "y": 100},
            "size": {"width": 180, "height": 280}
        })
    }

def create_pokemon_widget():
    """创建宝可梦挂件Demo"""
    html_code = '''
    <div class="pokemon-container">
        <div class="pokemon-character" id="pikachu">
            <div class="pokemon-ears">
                <div class="ear left">
                    <div class="ear-tip"></div>
                </div>
                <div class="ear right">
                    <div class="ear-tip"></div>
                </div>
            </div>
            <div class="pokemon-head">
                <div class="cheeks">
                    <div class="cheek left"></div>
                    <div class="cheek right"></div>
                </div>
                <div class="eyes">
                    <div class="eye left">
                        <div class="pupil"></div>
                    </div>
                    <div class="eye right">
                        <div class="pupil"></div>
                    </div>
                </div>
                <div class="nose"></div>
                <div class="mouth"></div>
            </div>
            <div class="pokemon-body">
                <div class="belly"></div>
                <div class="arms">
                    <div class="arm left"></div>
                    <div class="arm right"></div>
                </div>
            </div>
            <div class="pokemon-tail"></div>
        </div>
        <div class="pokemon-speech" id="pokemon-speech">
            <span id="pokemon-text">Pika Pika!</span>
        </div>
        <div class="pokemon-stats">
            <div class="stat">
                <span class="stat-label">HP:</span>
                <div class="stat-bar">
                    <div class="stat-fill hp" id="hp-bar"></div>
                </div>
            </div>
            <div class="stat">
                <span class="stat-label">LV:</span>
                <span id="pokemon-level">25</span>
            </div>
        </div>
    </div>
    '''
    
    css_code = '''
    .pokemon-container {
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #87CEEB, #98FB98, #F0E68C);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        position: relative;
        padding: 10px;
        box-sizing: border-box;
    }
    
    .pokemon-character {
        position: relative;
        animation: pokemonBounce 2s ease-in-out infinite;
    }
    
    .pokemon-ears {
        position: absolute;
        top: -25px;
        left: 50%;
        transform: translateX(-50%);
        width: 80px;
    }
    
    .ear {
        position: absolute;
        width: 25px;
        height: 35px;
        background: #FFD700;
        border: 2px solid #DAA520;
        border-radius: 50% 50% 0 0;
    }
    
    .ear.left { 
        left: 10px; 
        transform: rotate(-20deg);
    }
    
    .ear.right { 
        right: 10px; 
        transform: rotate(20deg);
    }
    
    .ear-tip {
        position: absolute;
        top: 5px;
        left: 50%;
        transform: translateX(-50%);
        width: 15px;
        height: 20px;
        background: #2F4F4F;
        border-radius: 50% 50% 0 0;
    }
    
    .pokemon-head {
        width: 70px;
        height: 70px;
        background: #FFD700;
        border-radius: 50%;
        border: 2px solid #DAA520;
        position: relative;
    }
    
    .cheeks {
        position: absolute;
        top: 30px;
        width: 100%;
    }
    
    .cheek {
        position: absolute;
        width: 12px;
        height: 12px;
        background: #FF6347;
        border-radius: 50%;
        animation: cheekGlow 3s ease-in-out infinite;
    }
    
    .cheek.left { left: -5px; }
    .cheek.right { right: -5px; }
    
    .eyes {
        position: absolute;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 15px;
    }
    
    .eye {
        width: 12px;
        height: 15px;
        background: #000;
        border-radius: 50%;
        position: relative;
    }
    
    .pupil {
        position: absolute;
        top: 2px;
        left: 2px;
        width: 4px;
        height: 4px;
        background: #FFF;
        border-radius: 50%;
    }
    
    .nose {
        position: absolute;
        top: 35px;
        left: 50%;
        transform: translateX(-50%);
        width: 4px;
        height: 3px;
        background: #2F4F4F;
        border-radius: 50%;
    }
    
    .mouth {
        position: absolute;
        top: 40px;
        left: 50%;
        transform: translateX(-50%);
        width: 10px;
        height: 6px;
        border: 2px solid #2F4F4F;
        border-top: none;
        border-radius: 0 0 50px 50px;
    }
    
    .pokemon-body {
        width: 60px;
        height: 70px;
        background: #FFD700;
        border: 2px solid #DAA520;
        border-radius: 20px;
        position: relative;
        margin-top: 5px;
    }
    
    .belly {
        position: absolute;
        top: 15px;
        left: 50%;
        transform: translateX(-50%);
        width: 40px;
        height: 40px;
        background: #FFFF99;
        border-radius: 50%;
    }
    
    .arms {
        position: absolute;
        top: 20px;
        width: 100%;
    }
    
    .arm {
        position: absolute;
        width: 12px;
        height: 25px;
        background: #FFD700;
        border: 1px solid #DAA520;
        border-radius: 10px;
    }
    
    .arm.left { left: -8px; }
    .arm.right { right: -8px; }
    
    .pokemon-tail {
        position: absolute;
        right: -20px;
        top: 20px;
        width: 25px;
        height: 40px;
        background: #FFD700;
        border: 2px solid #DAA520;
        clip-path: polygon(0% 100%, 100% 50%, 80% 0%, 20% 20%);
        animation: tailWag 1.5s ease-in-out infinite;
    }
    
    .pokemon-speech {
        background: rgba(255, 255, 255, 0.9);
        border: 2px solid #DAA520;
        border-radius: 15px;
        padding: 8px 12px;
        margin: 10px 0;
        font-size: 12px;
        font-weight: bold;
        color: #2F4F4F;
        animation: speechBubble 2s ease-in-out infinite;
        position: relative;
    }
    
    .pokemon-speech::before {
        content: '';
        position: absolute;
        bottom: -8px;
        left: 20px;
        width: 0;
        height: 0;
        border-left: 8px solid transparent;
        border-right: 8px solid transparent;
        border-top: 8px solid #DAA520;
    }
    
    .pokemon-stats {
        width: 100%;
        margin-top: 10px;
        font-size: 10px;
        color: #2F4F4F;
        font-weight: bold;
    }
    
    .stat {
        display: flex;
        align-items: center;
        margin: 3px 0;
        gap: 5px;
    }
    
    .stat-label {
        min-width: 25px;
    }
    
    .stat-bar {
        flex: 1;
        height: 8px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
        overflow: hidden;
    }
    
    .stat-fill {
        height: 100%;
        border-radius: 4px;
        transition: width 0.3s ease;
    }
    
    .stat-fill.hp {
        background: linear-gradient(90deg, #32CD32, #228B22);
        width: 80%;
    }
    
    @keyframes pokemonBounce {
        0%, 100% { transform: translateY(0px); }
        50% { transform: translateY(-8px); }
    }
    
    @keyframes cheekGlow {
        0%, 100% { 
            box-shadow: 0 0 5px #FF6347; 
            transform: scale(1);
        }
        50% { 
            box-shadow: 0 0 15px #FF6347, 0 0 25px #FF4500; 
            transform: scale(1.1);
        }
    }
    
    @keyframes tailWag {
        0%, 100% { transform: rotate(0deg); }
        50% { transform: rotate(15deg); }
    }
    
    @keyframes speechBubble {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
    '''
    
    js_code = '''
    // 宝可梦挂件交互功能
    const pokemonSounds = [
        "Pika Pika!",
        "Pikachu!",
        "Pika pika chu!",
        "Chu chu!",
        "Piiiika!"
    ];
    
    let soundIndex = 0;
    let level = 25;
    let hp = 80;
    
    function playPokemonSound() {
        const textElement = document.getElementById('pokemon-text');
        if (textElement) {
            soundIndex = (soundIndex + 1) % pokemonSounds.length;
            textElement.textContent = pokemonSounds[soundIndex];
        }
    }
    
    function updateStats() {
        // 随机变化HP
        hp = Math.max(20, Math.min(100, hp + (Math.random() > 0.5 ? 5 : -3)));
        const hpBar = document.getElementById('hp-bar');
        if (hpBar) {
            hpBar.style.width = hp + '%';
            
            // HP颜色变化
            if (hp > 60) {
                hpBar.style.background = 'linear-gradient(90deg, #32CD32, #228B22)';
            } else if (hp > 30) {
                hpBar.style.background = 'linear-gradient(90deg, #FFD700, #FFA500)';
            } else {
                hpBar.style.background = 'linear-gradient(90deg, #FF6347, #DC143C)';
            }
        }
        
        // 偶尔升级
        if (Math.random() > 0.9 && level < 50) {
            level++;
            const levelElement = document.getElementById('pokemon-level');
            if (levelElement) {
                levelElement.textContent = level;
            }
        }
    }
    
    function thunderbolt() {
        const character = document.getElementById('pikachu');
        if (character) {
            character.style.filter = 'brightness(2) drop-shadow(0 0 20px #FFD700)';
            setTimeout(() => {
                character.style.filter = 'none';
            }, 200);
        }
        playPokemonSound();
    }
    
    // 每4秒播放声音
    setInterval(playPokemonSound, 4000);
    
    // 每6秒更新状态
    setInterval(updateStats, 6000);
    
    // 点击使用十万伏特
    const container = document.querySelector('.pokemon-container');
    if (container) {
        container.addEventListener('click', thunderbolt);
    }
    '''
    
    return {
        'widget_id': 'pokemon',
        'name': '皮卡丘',
        'description': '可爱的皮卡丘宝可梦，会发出叫声，显示状态，点击可使用十万伏特',
        'widget_type': 'pokemon',
        'html_code': html_code,
        'css_code': css_code,
        'js_code': js_code,
        'preview_image_url': '/static/images/pokemon_preview.png',
        'default_config': json.dumps({
            "position": {"x": 150, "y": 50},
            "size": {"width": 200, "height": 320}
        })
    }

def init_demo_widgets():
    """初始化演示挂件数据"""
    with app.app_context():
        try:
            print("正在创建数据库表...")
            db.create_all()
            
            # 检查是否已存在演示数据
            existing_widgets = Widget.query.filter(
                Widget.widget_id.in_(['catgirl', 'transformer', 'pokemon'])
            ).all()
            
            if existing_widgets:
                print(f"发现 {len(existing_widgets)} 个已存在的预设挂件，正在更新...")
                for widget in existing_widgets:
                    db.session.delete(widget)
                db.session.commit()
            
            # 创建三个演示挂件
            widgets_data = [
                create_catgirl_widget(),
                create_transformer_widget(),
                create_pokemon_widget()
            ]
            
            print("正在创建预设挂件...")
            for widget_data in widgets_data:
                widget = Widget(**widget_data)
                db.session.add(widget)
                print(f"✓ 创建挂件: {widget_data['name']} (ID: {widget_data['widget_id']})")
            
            db.session.commit()
            print(f"\n🎉 成功创建 {len(widgets_data)} 个预设挂件!")
            
            # 显示创建的挂件信息
            print("\n📋 挂件详情:")
            for widget_data in widgets_data:
                print(f"\n🔹 {widget_data['name']} ({widget_data['widget_id']})")
                print(f"   描述: {widget_data['description']}")
                print(f"   HTML长度: {len(widget_data['html_code'])} 字符")
                print(f"   CSS长度: {len(widget_data['css_code'])} 字符")
                print(f"   JS长度: {len(widget_data['js_code'])} 字符")
                print(f"   默认配置: {widget_data['default_config']}")
            
        except Exception as e:
            print(f"❌ 初始化失败: {str(e)}")
            db.session.rollback()
            raise

if __name__ == '__main__':
    print("🚀 StyleSwift 预设挂件 Demo 数据初始化")
    print("=" * 50)
    init_demo_widgets()
    print("\n✅ 初始化完成！现在您可以测试预设挂件功能了。") 