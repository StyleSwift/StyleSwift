import requests
import json

# API 的 URL
url = "http://localhost:5000/api/generate_ai_style"

# 请求的数据
data = {
    "pageStructure": """
    <header>
        <h1>Welcome to My Website</h1>
        <nav>
            <ul>
                <li><a href="#home">Home</a></li>
                <li><a href="#about">About</a></li>
                <li><a href="#contact">Contact</a></li>
            </ul>
        </nav>
    </header>
    <main>
        <section id="home">
            <h2>Home</h2>
            <p>Welcome to our homepage!</p>
        </section>
        <section id="about">
            <h2>About Us</h2>
            <p>Learn more about our company.</p>
        </section>
        <section id="contact">
            <h2>Contact Us</h2>
            <form>
                <input type="text" placeholder="Your Name">
                <input type="email" placeholder="Your Email">
                <textarea placeholder="Your Message"></textarea>
                <button type="submit">Send</button>
            </form>
        </section>
    </main>
    <footer>
        <p>&copy; 2024 My Website. All rights reserved.</p>
    </footer>
    """,
    "url": "https://example.com"
}

# 发送 POST 请求
response = requests.post(url, json=data)

# 检查响应
if response.status_code == 200:
    result = response.json()
    print("AI style generated successfully!")
    print("Generated style:")
    print(result["style_code"])
else:
    print(f"Error: {response.status_code}")
    print(response.text)