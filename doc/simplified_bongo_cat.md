# 🐱 Bongo Cat 挂件 - 标准格式代码

## HTML 代码：
```html
<div class="bongo-container interactive clickable" data-behavior="bounce">
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
</div>
```

## CSS 代码：
```css
.bongo-container {
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

.bongo-cat {
  position: relative;
  text-align: center;
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

.note:nth-child(1) {
  left: 20%;
  animation-delay: 0s;
}

.note:nth-child(2) {
  left: 50%;
  animation-delay: 0.7s;
}

.note:nth-child(3) {
  left: 80%;
  animation-delay: 1.4s;
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
}

.bongo-container:active {
  transform: scale(0.98);
}

.bongo-container:hover .paw-left,
.bongo-container:hover .paw-right {
  animation-duration: 0.3s;
}

.bongo-container:hover .note {
  animation-duration: 1s;
}
```

## JavaScript 代码：
```javascript
// Bongo Cat 挂件交互逻辑
console.log("🐱 Bongo Cat 挂件已加载！");

// 获取挂件容器
const bongoContainer = document.querySelector('.bongo-container');

if (bongoContainer) {
  // 点击音效
  bongoContainer.addEventListener('click', function() {
    // 创建敲击音效
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // 模拟敲鼓声音
      oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(80, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
    } catch (e) {
      console.log('音效播放失败:', e);
    }
    
    // 添加点击视觉反馈
    bongoContainer.style.transform = 'scale(0.95)';
    setTimeout(() => {
      bongoContainer.style.transform = '';
    }, 150);
  });
  
  // 鼠标进入时加速动画
  bongoContainer.addEventListener('mouseenter', function() {
    const paws = bongoContainer.querySelectorAll('.paw');
    const notes = bongoContainer.querySelectorAll('.note');
    
    paws.forEach(paw => {
      paw.style.animationDuration = '0.3s';
    });
    
    notes.forEach(note => {
      note.style.animationDuration = '1s';
    });
  });
  
  // 鼠标离开时恢复正常速度
  bongoContainer.addEventListener('mouseleave', function() {
    const paws = bongoContainer.querySelectorAll('.paw');
    const notes = bongoContainer.querySelectorAll('.note');
    
    paws.forEach(paw => {
      paw.style.animationDuration = '';
    });
    
    notes.forEach(note => {
      note.style.animationDuration = '';
    });
  });
  
  // 随机触发额外音符
  setInterval(() => {
    if (Math.random() > 0.7) { // 30% 几率
      const extraNote = document.createElement('span');
      extraNote.textContent = ['🎵', '🎶', '🎼'][Math.floor(Math.random() * 3)];
      extraNote.className = 'note';
      extraNote.style.left = Math.random() * 80 + 10 + '%';
      extraNote.style.fontSize = Math.random() * 8 + 12 + 'px';
      
      const musicNotes = bongoContainer.querySelector('.music-notes');
      if (musicNotes) {
        musicNotes.appendChild(extraNote);
        
        // 3秒后移除
        setTimeout(() => {
          if (extraNote.parentNode) {
            extraNote.parentNode.removeChild(extraNote);
          }
        }, 3000);
      }
    }
  }, 2000);
}
```

---

## 🎯 使用说明：

1. **复制 HTML 代码** 到扩展的"自定义代码" → HTML 输入框
2. **复制 CSS 代码** 到扩展的"自定义代码" → CSS 输入框  
3. **复制 JavaScript 代码** 到扩展的"自定义代码" → JS 输入框
4. **点击"应用到所有站点"**

## ✨ 功能特性：

- 🎵 **动画效果**：猫咪头部摆动、爪子敲击、音符飘浮
- 🔊 **音效互动**：点击播放敲击声音
- 🎨 **视觉效果**：渐变背景、发光效果、缩放动画
- 🖱️ **鼠标交互**：悬停时动画加速，点击有反馈
- 🎶 **随机音符**：自动生成额外的飘浮音符

这个版本使用了标准的HTML、CSS和JavaScript，完全兼容我们的挂件系统！ 