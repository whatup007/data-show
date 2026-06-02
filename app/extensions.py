from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask_wtf.csrf import CSRFProtect
from flask_cors import CORS
from flask_socketio import SocketIO

db = SQLAlchemy()
migrate = Migrate()
login_manager = LoginManager()
csrf = CSRFProtect()
socketio = SocketIO(cors_allowed_origins="*")


def init_extensions(app):
    db.init_app(app)
    migrate.init_app(app, db)
    login_manager.init_app(app)
    csrf.init_app(app)
    CORS(app)
    socketio.init_app(app)

    login_manager.login_view = "main.login"
    login_manager.login_message = "请先登录"

    @login_manager.user_loader
    def load_user(user_id):
        try:
            from app.models import User
            return User.query.get(int(user_id))
        except (ImportError, AttributeError):
            return None
