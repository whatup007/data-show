from flask import Flask
from dotenv import load_dotenv
from config import Config

load_dotenv()


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    from app.extensions import init_extensions
    init_extensions(app)

    from app.routes import register_blueprints
    register_blueprints(app)

    return app
