from flask import render_template, request, jsonify
from app.routes import main_bp


@main_bp.route("/")
def index():
    return render_template("index.html")


@main_bp.route("/about")
def about():
    return render_template("about.html")


@main_bp.route("/api/hello", methods=["GET"])
def hello_api():
    name = request.args.get("name", "World")
    return jsonify({"message": f"Hello, {name}!"})
