import os
from app import create_app

app = create_app()

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("DEBUG", "true").lower() == "true"
    app.logger.info("启动服务器: %s:%s (debug=%s)", host, port, debug)
    app.run(host=host, port=port, debug=debug)
