from datetime import datetime, date, timedelta
import json
import time
import logging

from flask import Blueprint, jsonify, request
from sqlalchemy import func, select, cast, Date

from app.extensions import db
from app.models import Building, Appliance, LoadData, LoadDataDaily

logger = logging.getLogger(__name__)

api_bp = Blueprint("api", __name__)


_ttl = 300
_cache = {}

def cached(key, ttl=_ttl):
    now = time.time()
    if key in _cache:
        entry = _cache[key]
        if now - entry["time"] < ttl:
            return entry["data"]
    return None

def set_cache(key, data, ttl=_ttl):
    _cache[key] = {"data": data, "time": time.time()}

def cache_key(prefix, **params):
    parts = [prefix]
    for k, v in sorted(params.items()):
        parts.append(f"{k}={v}")
    return ":".join(parts)


def fill_missing_timestamps(data_list, start, end, interval):
    if not data_list:
        return data_list

    if interval == "15min":
        delta = timedelta(minutes=15)
        key_fmt = "%Y-%m-%d %H:%M"
    elif interval == "hour":
        delta = timedelta(hours=1)
        key_fmt = "%Y-%m-%d %H:00"
    elif interval == "day":
        delta = timedelta(days=1)
        key_fmt = "%Y-%m-%d"
    elif interval == "week":
        delta = timedelta(days=7)
        key_fmt = "%Y-%m-%d"
    else:
        return data_list

    lookup = {}
    for item in data_list:
        ts = item["timestamp"]
        if isinstance(ts, str):
            ts = _safe_fromisoformat(ts)
        key = ts.strftime(key_fmt)
        lookup[key] = item

    if interval == "15min":
        aligned_start = start.replace(minute=(start.minute // 15) * 15, second=0, microsecond=0)
    elif interval == "hour":
        aligned_start = start.replace(minute=0, second=0, microsecond=0)
    else:
        aligned_start = start.replace(hour=0, minute=0, second=0, microsecond=0)

    result = []
    current = aligned_start
    while current <= end:
        key = current.strftime(key_fmt)
        if key in lookup:
            result.append(lookup[key])
        else:
            result.append({
                "timestamp": current.isoformat(),
                "avg_power": 0,
                "min_power": 0,
                "max_power": 0,
                "count": 0,
            })
        current += delta

    return result


def _safe_fromisoformat(s):
    """Safely parse an ISO datetime string, handling 'Z' suffix not supported before Python 3.11."""
    if not s:
        return None
    try:
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        return datetime.fromisoformat(s)
    except (ValueError, TypeError) as e:
        logger.warning("Failed to parse datetime string: %r, error: %s", s, e)
        return None


@api_bp.route("/buildings")
def list_buildings():
    buildings = Building.query.all()
    return jsonify([
        {"id": b.id, "dataset": b.dataset, "building_id": b.building_id}
        for b in buildings
    ])


@api_bp.route("/buildings/<int:building_id>/appliances")
def list_appliances(building_id):
    apps = Appliance.query.filter_by(building_id=building_id).all()
    return jsonify([
        {
            "id": a.id,
            "meter_id": a.meter_id,
            "appliance_type": a.appliance_type,
            "is_site_meter": a.is_site_meter,
            "device_model": a.device_model,
        }
        for a in apps
    ])


@api_bp.route("/load-data")
def query_load_data():
    building_id = request.args.get("building_id", type=int)
    appliance_id = request.args.get("appliance_id", type=int)
    start_str = request.args.get("start")
    end_str = request.args.get("end")
    interval = request.args.get("interval", "hour")

    if not building_id:
        return jsonify({"error": "building_id is required"}), 400

    start = None
    end = None
    if start_str:
        start = _safe_fromisoformat(start_str)
    if end_str:
        end = _safe_fromisoformat(end_str)

    ck = cache_key("loaddata", building_id=building_id, appliance_id=appliance_id or 0,
                   interval=interval, start=start_str or "", end=end_str or "")
    cached_data = cached(ck, ttl=60)
    if cached_data:
        return jsonify(cached_data)

    if interval in ("day", "week", "month"):
        query = db.session.query(
            LoadDataDaily.date,
            func.avg(LoadDataDaily.avg_power).label("avg_power"),
            func.min(LoadDataDaily.min_power).label("min_power"),
            func.max(LoadDataDaily.max_power).label("max_power"),
            func.sum(LoadDataDaily.record_count).label("count"),
            func.sum(LoadDataDaily.total_energy).label("total_energy"),
        )
        query = query.filter(LoadDataDaily.building_id == building_id)
        if appliance_id:
            query = query.filter(LoadDataDaily.appliance_id == appliance_id)
        if start:
            query = query.filter(LoadDataDaily.date >= start.date())
        if end:
            query = query.filter(LoadDataDaily.date <= end.date())

        if interval == "day":
            query = query.group_by(LoadDataDaily.date).order_by(LoadDataDaily.date)
        elif interval == "week":
            week_start = func.date_format(LoadDataDaily.date, "%Y-%u")
            query = query.group_by(week_start).order_by(week_start)
        elif interval == "month":
            month = func.date_format(LoadDataDaily.date, "%Y-%m")
            query = query.group_by(month).order_by(month)
    else:
        query = db.session.query(
            LoadData.timestamp,
            func.avg(LoadData.power_watts).label("avg_power"),
            func.min(LoadData.power_watts).label("min_power"),
            func.max(LoadData.power_watts).label("max_power"),
            func.count(LoadData.id).label("count"),
        )
        query = query.filter(LoadData.building_id == building_id)
        if appliance_id:
            query = query.filter(LoadData.appliance_id == appliance_id)
        if start:
            query = query.filter(LoadData.timestamp >= start)
        if end:
            query = query.filter(LoadData.timestamp <= end)

        if interval == "15min":
            date_trunc = func.from_unixtime(
                func.floor(func.unix_timestamp(LoadData.timestamp) / 900) * 900
            )
        else:
            date_trunc = func.date_format(LoadData.timestamp, "%Y-%m-%d %H:00:00")
        query = query.group_by(date_trunc).order_by(date_trunc)

    rows = query.all()

    result = []
    for row in rows:
        if interval == "day":
            ts = datetime.combine(row.date, datetime.min.time()).isoformat()
        elif interval == "week":
            ts = str(row[0]) + "-1T00:00:00" if row[0] else None
        elif interval == "month":
            ts = f"{row[0]}-01T00:00:00" if row[0] else None
        else:
            ts = row.timestamp.isoformat() if hasattr(row.timestamp, "isoformat") else str(row.timestamp)

        result.append({
            "timestamp": ts,
            "avg_power": round(float(row.avg_power), 2),
            "min_power": round(float(row.min_power), 2),
            "max_power": round(float(row.max_power), 2),
            "count": row.count,
        })

    if start and end and interval not in ("month", "week"):
        result = fill_missing_timestamps(result, start, end, interval)

    set_cache(ck, result, ttl=60)
    return jsonify(result)


@api_bp.route("/load-data/summary")
def load_data_summary():
    building_id = request.args.get("building_id", type=int)
    appliance_id = request.args.get("appliance_id", type=int)

    if not building_id:
        return jsonify({"error": "building_id is required"}), 400

    ck = cache_key("summary", building_id=building_id, appliance_id=appliance_id or 0)
    cached_data = cached(ck)
    if cached_data:
        return jsonify(cached_data)

    total_records = func.sum(LoadDataDaily.record_count)
    total_energy = func.sum(LoadDataDaily.total_energy)
    avg_power = (total_energy / total_records).label("avg_power")

    if appliance_id:
        query = db.session.query(
            total_records.label("total_records"),
            total_energy.label("total_energy"),
            avg_power,
            func.min(LoadDataDaily.min_power).label("min_power"),
            func.max(LoadDataDaily.max_power).label("max_power"),
            func.min(LoadDataDaily.date).label("start_time"),
            func.max(LoadDataDaily.date).label("end_time"),
        )
        query = query.filter(
            LoadDataDaily.building_id == building_id,
            LoadDataDaily.appliance_id == appliance_id,
        )
    else:
        query = db.session.query(
            total_records.label("total_records"),
            total_energy.label("total_energy"),
            avg_power,
            func.min(LoadDataDaily.min_power).label("min_power"),
            func.max(LoadDataDaily.max_power).label("max_power"),
            func.min(LoadDataDaily.date).label("start_time"),
            func.max(LoadDataDaily.date).label("end_time"),
        )
        query = query.filter(LoadDataDaily.building_id == building_id)

    row = query.first()

    total_records = int(row.total_records or 0)
    total_energy = float(row.total_energy or 0)
    avg_power = (total_energy / total_records) if total_records > 0 else 0

    result = {
        "total_records": total_records,
        "avg_power": round(float(avg_power), 2),
        "min_power": round(float(row.min_power), 2) if row.min_power else 0,
        "max_power": round(float(row.max_power), 2) if row.max_power else 0,
        "total_energy": round(float(total_energy), 2),
        "start_time": row.start_time.isoformat() + "T00:00:00" if row.start_time else None,
        "end_time": row.end_time.isoformat() + "T23:59:59" if row.end_time else None,
    }

    set_cache(ck, result)
    return jsonify(result)


@api_bp.route("/statistics/overview")
def statistics_overview():
    buildings_count = Building.query.count()
    appliances_count = Appliance.query.count()

    overall = db.session.query(
        func.sum(LoadData.power_watts).label("total_energy"),
        func.max(LoadData.power_watts).label("peak_power"),
    ).first()

    return jsonify({
        "total_buildings": buildings_count,
        "total_appliances": appliances_count,
        "total_energy": round(float(overall.total_energy), 2) if overall.total_energy else 0,
        "peak_power": round(float(overall.peak_power), 2) if overall.peak_power else 0,
    })


@api_bp.route("/statistics/building-ranking")
def building_ranking():
    start_str = request.args.get("start")
    end_str = request.args.get("end")

    query = db.session.query(
        Building.id,
        Building.dataset,
        Building.building_id,
        func.sum(LoadData.power_watts).label("total_energy"),
        func.count(LoadData.id).label("record_count"),
    ).join(LoadData, Building.id == LoadData.building_id)

    if start_str:
        start = _safe_fromisoformat(start_str)
        if start:
            query = query.filter(LoadData.timestamp >= start)
    if end_str:
        end = _safe_fromisoformat(end_str)
        if end:
            query = query.filter(LoadData.timestamp <= end)

    query = query.group_by(Building.id).order_by(func.sum(LoadData.power_watts).desc())

    return jsonify([
        {
            "id": row.id,
            "dataset": row.dataset,
            "building_id": row.building_id,
            "total_energy": round(float(row.total_energy), 2),
            "record_count": row.record_count,
        }
        for row in query.all()
    ])


@api_bp.route("/statistics/appliance-distribution")
def appliance_distribution():
    building_id = request.args.get("building_id", type=int)
    start_str = request.args.get("start")
    end_str = request.args.get("end")

    if not building_id:
        return jsonify({"error": "building_id is required"}), 400

    query = db.session.query(
        Appliance.appliance_type,
        func.sum(LoadDataDaily.total_energy).label("total_energy"),
        func.sum(LoadDataDaily.record_count).label("record_count"),
    ).join(LoadDataDaily, Appliance.id == LoadDataDaily.appliance_id)

    query = query.filter(Appliance.building_id == building_id)
    query = query.filter(Appliance.is_site_meter == False)

    if start_str:
        start = _safe_fromisoformat(start_str)
        if start:
            query = query.filter(LoadDataDaily.date >= start.date())
    if end_str:
        end = _safe_fromisoformat(end_str)
        if end:
            query = query.filter(LoadDataDaily.date <= end.date())

    query = query.group_by(Appliance.appliance_type).order_by(func.sum(LoadDataDaily.total_energy).desc())

    return jsonify([
        {
            "type": row.appliance_type,
            "total_energy": round(float(row.total_energy), 2),
            "record_count": row.record_count,
        }
        for row in query.all()
    ])


@api_bp.route("/statistics/appliance-status")
def appliance_status():
    building_id = request.args.get("building_id", type=int)
    start_str = request.args.get("start")
    end_str = request.args.get("end")

    if not building_id:
        return jsonify({"error": "building_id is required"}), 400

    query = db.session.query(
        Appliance.id,
        Appliance.appliance_type,
        Appliance.meter_id,
        Appliance.is_site_meter,
        func.sum(LoadDataDaily.record_count).label("activation_count"),
        func.sum(LoadDataDaily.total_energy).label("total_energy"),
    ).join(LoadDataDaily, Appliance.id == LoadDataDaily.appliance_id)

    query = query.filter(Appliance.building_id == building_id)

    if start_str:
        start = _safe_fromisoformat(start_str)
        if start:
            query = query.filter(LoadDataDaily.date >= start.date())
    if end_str:
        end = _safe_fromisoformat(end_str)
        if end:
            query = query.filter(LoadDataDaily.date <= end.date())

    query = query.group_by(Appliance.id).order_by(func.sum(LoadDataDaily.record_count).desc())

    return jsonify([
        {
            "id": row.id,
            "appliance_type": row.appliance_type,
            "meter_id": row.meter_id,
            "is_site_meter": row.is_site_meter,
            "activation_count": row.activation_count,
            "total_energy": round(float(row.total_energy), 2) if row.total_energy else 0,
        }
        for row in query.all()
    ])


@api_bp.route("/buildings/<int:building_id>/rooms")
def building_rooms(building_id):
    building = Building.query.get(building_id)
    if not building:
        return jsonify({"error": "Building not found"}), 404
    if not building.metadata_json:
        return jsonify([])

    metadata = building.metadata_json
    if isinstance(metadata, str):
        try:
            metadata = json.loads(metadata)
        except (json.JSONDecodeError, TypeError):
            return jsonify([])

    rooms_raw = metadata.get("rooms", [])
    rooms = []
    seen = set()
    for r in rooms_raw:
        name = r.get("name", "unknown")
        instance = r.get("instance", 1)
        room_key = f"{name}_{instance}" if instance > 1 else name
        if room_key in seen:
            continue
        seen.add(room_key)
        floor = r.get("floor", 0)
        label = name.capitalize()
        if instance and instance > 1:
            if name == "bedroom":
                label = f"Bedroom {instance}"
            else:
                label = f"{label} {instance}"
        rooms.append({
            "key": room_key,
            "name": name,
            "label": label,
            "floor": floor,
            "instance": instance,
        })

    appliances = Appliance.query.filter_by(building_id=building_id).all()
    metadata_apps = metadata.get("appliances", [])
    app_room_map = {}
    for app in metadata_apps:
        room = app.get("room", "")
        app_type = app.get("type", "unknown")
        original_name = app.get("original_name", "")
        for m in app.get("meters", []):
            if room:
                app_room_map.setdefault(room, []).append({
                    "type": app_type,
                    "original_name": original_name,
                    "meter_id": m,
                    "is_site_meter": False,
                })

    for app in appliances:
        if app.is_site_meter:
            app_room_map.setdefault("site_meter", []).append({
                "type": "main_meter",
                "original_name": "Site Meter",
                "meter_id": app.meter_id,
                "is_site_meter": True,
            })

    for room in rooms:
        rn = room["name"]
        rn_instance = f"{rn}_{room['instance']}" if room.get("instance", 1) > 1 else rn
        room_apps = app_room_map.get(room["key"], [])
        if not room_apps:
            room_apps = app_room_map.get(rn, [])
        if not room_apps:
            room_apps = app_room_map.get(rn_instance, [])
        room["appliances"] = room_apps

    return jsonify(rooms)


# 电器类型 → 房间的自动匹配规则
ROOM_MATCH_RULES = {
    "kitchen": {
        "keywords": ["kettle", "toaster", "microwave", "fridge", "freezer", "dish washer",
                     "breadmaker", "coffee", "oven", "cooker", "food processor",
                     "sandwich", "rice cooker", "electric stove"],
        "types": ["kettle", "toaster", "microwave", "fridge", "freezer", "dish washer",
                  "breadmaker", "coffee maker", "cooker", "food processor",
                  "toasted sandwich maker", "rice cooker", "electric oven", "electric stove",
                  "oven", "kitchen aid", "wireless phone charger"],
    },
    "lounge": {
        "keywords": ["tv", "television", "htpc", "audio", "subwoofer", "dvd", "receiver",
                     "amplifier", "radio", "game", "xbox", "playstation", "ipad", "tablet"],
        "types": ["television", "HTPC", "audio amplifier", "active subwoofer", "radio",
                  "tablet computer charger", "games console", "set top box", "audio system",
                  "active speaker", "projector"],
    },
    "bedroom": {
        "keywords": ["bedroom", "lamp", "alarm", "clock"],
        "types": ["clock alarm", "light"],
    },
    "bedroom_2": {
        "keywords": ["bedroom"],
        "types": [],
    },
    "study": {
        "keywords": ["computer", "laptop", "monitor", "printer", "router", "modem",
                     "hub", "ethernet", "switch", "usb", "charger", "soldering",
                     "network", "server", "nas", "hard disk"],
        "types": ["laptop computer", "desktop computer", "computer", "computer monitor",
                  "printer", "broadband router", "modem", "ethernet switch", "USB hub",
                  "charger", "soldering iron", "external hard disk", "network attached storage",
                  "server computer", "fan", "desktop computer"],
    },
    "utility": {
        "keywords": ["washing", "washer", "dryer", "vacuum", "iron", "clothes"],
        "types": ["washer dryer", "washing machine", "vacuum cleaner", "clothes iron"],
    },
    "bathroom": {
        "keywords": ["shower", "bathroom", "hair", "shaver", "immersion"],
        "types": ["hair dryer", "immersion heater"],
    },
    "hall": {
        "keywords": ["router", "alarm", "security"],
        "types": ["security alarm", "broadband router"],
    },
    "dining room": {
        "keywords": ["dining"],
        "types": [],
    },
}


def _get_default_room(appliance_type):
    """根据电器类型自动匹配默认房间"""
    atype = appliance_type.lower()
    for room, rules in ROOM_MATCH_RULES.items():
        for kw in rules["keywords"]:
            if kw in atype:
                return room
        for t in rules["types"]:
            if t.lower() == atype:
                return room
    return None


@api_bp.route("/load-data/by-room")
def load_data_by_room():
    building_id = request.args.get("building_id", type=int)
    room_name = request.args.get("room")
    start_str = request.args.get("start")
    end_str = request.args.get("end")

    if not building_id or not room_name:
        return jsonify({"error": "building_id and room are required"}), 400

    building = Building.query.get(building_id)
    if not building:
        return jsonify({"error": "Building not found"}), 404

    logger.info("load_data_by_room: building_id=%s, room=%s, start=%s, end=%s",
                building_id, room_name, start_str, end_str)

    meter_ids = set()
    used_default_match = False

    if building.metadata_json:
        metadata = building.metadata_json
        if isinstance(metadata, str):
            try:
                metadata = json.loads(metadata)
            except (json.JSONDecodeError, TypeError):
                metadata = None

        if metadata:
            for app in metadata.get("appliances", []):
                app_room = app.get("room", "")
                if app_room == room_name:
                    for m in app.get("meters", []):
                        if m > 0:
                            meter_ids.add(m)

    logger.info("load_data_by_room: metadata match found %d meter(s)", len(meter_ids))

    # 如果 metadata 中没有找到匹配的房间，使用自动匹配
    if not meter_ids:
        used_default_match = True
        appliances_in_building = Appliance.query.filter(
            Appliance.building_id == building_id,
            Appliance.is_site_meter == False,
        ).all()

        for app in appliances_in_building:
            matched_room = _get_default_room(app.appliance_type)
            if matched_room == room_name:
                meter_ids.add(app.meter_id)

        logger.info("load_data_by_room: default match found %d meter(s) for room '%s'",
                    len(meter_ids), room_name)

    if not meter_ids:
        logger.warning("load_data_by_room: no meters found for room '%s' in building %d",
                       room_name, building_id)
        return jsonify([])

    appliances = Appliance.query.filter(
        Appliance.building_id == building_id,
        Appliance.meter_id.in_(meter_ids)
    ).all()

    app_ids = [a.id for a in appliances]
    if not app_ids:
        logger.warning("load_data_by_room: no appliances found for meter_ids %s", meter_ids)
        return jsonify([])

    logger.info("load_data_by_room: found %d appliance(s), querying LoadDataDaily", len(app_ids))

    query = db.session.query(
        Appliance.meter_id,
        Appliance.appliance_type,
        func.sum(LoadDataDaily.total_energy).label("total_energy"),
        func.sum(LoadDataDaily.record_count).label("record_count"),
        func.avg(LoadDataDaily.avg_power).label("avg_power"),
    ).join(Appliance, Appliance.id == LoadDataDaily.appliance_id)

    query = query.filter(LoadDataDaily.appliance_id.in_(app_ids))

    if start_str:
        start = _safe_fromisoformat(start_str)
        if start:
            query = query.filter(LoadDataDaily.date >= start.date())
    if end_str:
        end = _safe_fromisoformat(end_str)
        if end:
            query = query.filter(LoadDataDaily.date <= end.date())

    query = query.group_by(Appliance.id, Appliance.meter_id, Appliance.appliance_type)

    rows = query.all()

    logger.info("load_data_by_room: query returned %d row(s)", len(rows))

    result = []
    for row in rows:
        total_energy = float(row.total_energy or 0)
        energy_kwh = total_energy / 1000
        result.append({
            "meter_id": row.meter_id,
            "appliance_type": row.appliance_type,
            "total_energy": round(total_energy, 2),
            "energy_kwh": round(energy_kwh, 2),
            "avg_power": round(float(row.avg_power or 0), 2),
            "record_count": int(row.record_count or 0),
        })

    return jsonify(result)
