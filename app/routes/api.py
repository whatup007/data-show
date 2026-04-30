from flask import Blueprint, jsonify, request

api_bp = Blueprint("api", __name__)


@api_bp.route("/hello")
def hello():
    name = request.args.get("name", "World")
    return jsonify({"message": f"Hello, {name}!"})


@api_bp.route("/health")
def health():
    return jsonify({"status": "ok"})
