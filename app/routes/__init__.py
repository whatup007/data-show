from app.routes.main import main_bp
from app.routes.api import api_bp
from app.routes.ai import ai_bp


def register_blueprints(app):
    app.register_blueprint(main_bp)
    app.register_blueprint(api_bp, url_prefix="/api")
    app.register_blueprint(ai_bp)
