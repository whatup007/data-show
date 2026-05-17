from flask import Blueprint, render_template, current_app

main_bp = Blueprint("main", __name__)


@main_bp.route("/")
def index():
    current_app.logger.info("访问首页")
    return render_template("index.html")


@main_bp.route("/about")
def about():
    current_app.logger.info("访问关于页面")
    return render_template("about.html")


@main_bp.route("/dashboard")
def dashboard():
    current_app.logger.info("访问数据看板")
    return render_template("dashboard.html")
