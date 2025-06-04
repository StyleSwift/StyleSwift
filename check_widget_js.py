from app import app, Widget

def check_widget_js():
    """检查挂件的JavaScript代码"""
    with app.app_context():
        widgets = Widget.query.all()
        
        for widget in widgets:
            print(f"\n=== {widget.name} ({widget.widget_id}) ===")
            print(f"JS代码长度: {len(widget.js_code)} 字符")
            
            if widget.js_code:
                # 显示前300字符
                preview = widget.js_code[:300]
                if len(widget.js_code) > 300:
                    preview += "..."
                
                print("JS代码预览:")
                print("-" * 40)
                print(preview)
                print("-" * 40)
            else:
                print("无JavaScript代码")

if __name__ == "__main__":
    check_widget_js() 