"""
Import UK-DALE / REDD HDF5 datasets into MySQL.

Usage:
    # Import all buildings
    python scripts/import_h5.py UK-DALE.h5 --dataset ukdale

    # Import only building 1
    python scripts/import_h5.py UK-DALE.h5 --dataset ukdale --building 1

    # Import only site meter + key appliances of building 1
    python scripts/import_h5.py UK-DALE.h5 --dataset ukdale --building 1 --meters 1,5,6,7,10,12,13

    # Import only data from a specific year (e.g. 2014) with 15-min aggregation, skip idle
    python scripts/import_h5.py UK-DALE.h5 --dataset ukdale --building 1 --meters 1,5,6,7,10,12,13 --start-date 2014-01-01 --end-date 2014-12-31 --idle-threshold 0

    # Force re-import
    python scripts/import_h5.py UK-DALE.h5 --dataset ukdale --building 1 --meters 1,5,6,7,10,12,13 --force
"""

import argparse
import gc
import pickle
import sys
from datetime import datetime, timezone
from pathlib import Path

import h5py
import hdf5plugin
from sqlalchemy import insert

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from app import create_app
from app.extensions import db

SCAN_BATCH = 5000
INSERT_BATCH = 2000


def resolve_data_path(filepath, data_dir=None):
    if data_dir:
        base = Path(data_dir)
    else:
        sibling = PROJECT_ROOT.parent / "data"
        inside = PROJECT_ROOT / "data"
        if sibling.exists():
            base = sibling
        else:
            base = inside
    path = Path(filepath)
    if path.is_absolute():
        return str(path)
    return str(base / path)


def parse_metadata(meta_bytes):
    if isinstance(meta_bytes, bytes):
        try:
            return pickle.loads(meta_bytes)
        except Exception:
            return None
    return None


def extract_meter_info(metadata):
    meter_info = {}
    elec_meters = metadata.get("elec_meters", {})
    for mid_str, minfo in elec_meters.items():
        mid = int(mid_str)
        meter_info[mid] = {
            "device_model": minfo.get("device_model", ""),
            "is_site_meter": bool(minfo.get("site_meter", False)),
            "submeter_of": minfo.get("submeter_of", 0),
        }
    appliances = metadata.get("appliances", [])
    app_meter_map = {}
    for app in appliances:
        app_type = app.get("type", "unknown")
        for m in app.get("meters", []):
            app_meter_map[m] = app_type
    for mid in meter_info:
        meter_info[mid]["appliance_type"] = app_meter_map.get(mid, "unknown")
    return meter_info


def extract_redd_meter_info(num_meters):
    return {
        i: {
            "device_model": "",
            "is_site_meter": i == 1,
            "submeter_of": 0,
            "appliance_type": "unknown",
        }
        for i in range(1, num_meters + 1)
    }


def import_h5_file(filepath, dataset_name, force=False, building_id_filter=None, meters_filter=None,
                   start_date=None, end_date=None, idle_threshold=0):
    from app.models import Building, Appliance, LoadData

    app = create_app()
    with app.app_context():
        if building_id_filter:
            dataset_key = f"{dataset_name}_b{building_id_filter}"
        else:
            dataset_key = dataset_name

        existing = Building.query.filter_by(dataset=dataset_key).first()
        if existing:
            if not force:
                print(f"Dataset '{dataset_key}' already imported. Use --force to re-import.")
                return
            print(f"Dataset '{dataset_key}' exists. Using incremental mode (appending new date ranges)...")
            existing_building = existing
            building_loaded = True

            existing_appliances = Appliance.query.filter_by(building_id=existing_building.id).all()
            existing_app_map = {}
            for app in existing_appliances:
                existing_app_map[app.meter_id] = app

            if start_date:
                existing_min = db.session.query(db.func.min(LoadData.timestamp)).filter(
                    LoadData.building_id == existing_building.id
                ).scalar()
                existing_max = db.session.query(db.func.max(LoadData.timestamp)).filter(
                    LoadData.building_id == existing_building.id
                ).scalar()

                if existing_max:
                    if hasattr(existing_max, 'tzinfo') and existing_max.tzinfo is None:
                        existing_max = existing_max.replace(tzinfo=timezone.utc)
                if existing_min:
                    if hasattr(existing_min, 'tzinfo') and existing_min.tzinfo is None:
                        existing_min = existing_min.replace(tzinfo=timezone.utc)

                if existing_min and existing_max:
                    sd = start_date if hasattr(start_date, 'tzinfo') else start_date.replace(tzinfo=timezone.utc)
                    if sd >= existing_min and sd <= existing_max:
                        print(f"  Warning: start_date {sd.date()} is within existing data range ({existing_min.date()} ~ {existing_max.date()})")
                        print(f"  Use a start_date before {existing_min.date()} or after {existing_max.date()} to add new data")
                        print(f"  Or use --force without --start-date to rebuild from all available data")
                        f = None
                        return
        else:
            existing_building = None
            building_loaded = False
            existing_app_map = {}

        print(f"Opening {filepath}...")
        f = h5py.File(filepath, "r")

        for building_key in f:
            if not building_key.startswith("building"):
                continue
            bid = int(building_key.replace("building", ""))
            if building_id_filter is not None and bid != building_id_filter:
                print(f"  Skipping building {bid} (requested only building {building_id_filter})")
                continue

            bg = f[building_key]
            print(f"\n=== Processing {building_key} ===")

            metadata = None
            meta_attr = bg.attrs.get("metadata")
            if meta_attr is not None:
                metadata = parse_metadata(meta_attr)

            if not building_loaded:
                building = Building(dataset=dataset_key, building_id=bid, metadata_json=metadata)
                db.session.add(building)
                db.session.flush()
            else:
                building = existing_building
                if metadata:
                    building.metadata_json = metadata

            if dataset_name == "ukdale" and metadata:
                meter_info = extract_meter_info(metadata)
            else:
                meter_keys = [k for k in bg["elec"] if k.startswith("meter")]
                meter_info = extract_redd_meter_info(len(meter_keys))

            appliances = {}
            for mid, minfo in sorted(meter_info.items()):
                if mid in existing_app_map:
                    appliance = existing_app_map[mid]
                else:
                    appliance = Appliance(
                        building_id=building.id,
                        meter_id=mid,
                        appliance_type=minfo.get("appliance_type", "unknown"),
                        is_site_meter=minfo.get("is_site_meter", False),
                        device_model=minfo.get("device_model", ""),
                        submeter_of=minfo.get("submeter_of", 0),
                    )
                    db.session.add(appliance)
                    db.session.flush()
                appliances[mid] = appliance
                print(f"  meter{mid} -> {minfo.get('appliance_type', 'unknown')}")

            db.session.commit()
            gc.collect()

            total_rows = 0
            for mid, appliance in sorted(appliances.items()):
                if meters_filter is not None and mid not in meters_filter:
                    print(f"  Skipping meter{mid} (not in --meters filter)")
                    continue
                meter_path = f"elec/meter{mid}/table"
                if meter_path not in bg:
                    continue
                table = bg[meter_path]
                nrows = table.shape[0]
                print(f"  Importing meter{mid}: {nrows:,} rows -> 15-min aggregation...")
                if start_date or end_date:
                    date_info = f"{start_date or '...'} ~ {end_date or '...'}"
                    print(f"    Filtering by date range: {date_info}")
                if idle_threshold > 0:
                    print(f"    Skipping idle intervals (avg power < {idle_threshold}W)")

                current_fifteen = None
                fifteen_sum = 0.0
                fifteen_count = 0
                agg_rows = []
                agg_count = 0
                skipped = 0
                idle_skipped = 0

                for offset in range(0, nrows, SCAN_BATCH):
                    chunk = table[offset: offset + SCAN_BATCH]
                    raw_ts = chunk["index"]
                    raw_pw = chunk["values_block_0"]

                    for i in range(len(raw_ts)):
                        pw = float(raw_pw[i][0] if raw_pw.ndim > 1 else raw_pw[i])
                        if pw != pw:
                            continue
                        ts = datetime.fromtimestamp(int(raw_ts[i]) / 1e9, tz=timezone.utc)

                        if start_date and ts < start_date:
                            skipped += 1
                            continue
                        if end_date and ts > end_date:
                            skipped += 1
                            continue

                        minute_of_hour = ts.minute
                        fifteen_key = ts.replace(minute=(minute_of_hour // 15) * 15, second=0, microsecond=0)

                        if current_fifteen is None:
                            current_fifteen = fifteen_key

                        if fifteen_key == current_fifteen:
                            fifteen_sum += pw
                            fifteen_count += 1
                        else:
                            if fifteen_count > 0:
                                avg_power = round(fifteen_sum / fifteen_count, 2)
                                if avg_power >= idle_threshold:
                                    agg_rows.append({
                                        "building_id": building.id,
                                        "appliance_id": appliance.id,
                                        "timestamp": current_fifteen,
                                        "power_watts": avg_power,
                                    })
                                    agg_count += 1
                                else:
                                    idle_skipped += 1

                            if len(agg_rows) >= INSERT_BATCH:
                                db.session.execute(insert(LoadData), agg_rows)
                                db.session.commit()
                                total_rows += len(agg_rows)
                                agg_rows = []

                            current_fifteen = fifteen_key
                            fifteen_sum = pw
                            fifteen_count = 1

                    del chunk, raw_ts, raw_pw
                    if offset % (SCAN_BATCH * 20) == 0:
                        gc.collect()

                    if offset % (SCAN_BATCH * 5) == 0:
                        print(f"    Scanned {min(offset + SCAN_BATCH, nrows):,}/{nrows:,} (aggregated {agg_count:,} intervals)")

                if fifteen_count > 0:
                    avg_power = round(fifteen_sum / fifteen_count, 2)
                    if avg_power >= idle_threshold:
                        agg_rows.append({
                            "building_id": building.id,
                            "appliance_id": appliance.id,
                            "timestamp": current_fifteen,
                            "power_watts": avg_power,
                        })
                        agg_count += 1
                    else:
                        idle_skipped += 1

                if agg_rows:
                    db.session.execute(insert(LoadData), agg_rows)
                    db.session.commit()
                    total_rows += len(agg_rows)

                db.session.expire_all()
                gc.collect()
                skip_info = f", skipped {skipped:,} outside range" if skipped else ""
                idle_info = f", idle_skipped {idle_skipped:,}" if idle_skipped else ""
                print(f"  Done meter{mid}: {nrows:,} raw -> {agg_count:,} 15-min avg rows{skip_info}{idle_info}")

            print(f"  Total for building {bid}: {total_rows:,} rows")

        f.close()
        print(f"\nDataset '{dataset_key}' imported successfully.")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("filepath", help="Path or filename of the .h5 file")
    parser.add_argument("--dataset", required=True, choices=["ukdale", "redd"])
    parser.add_argument("--building", type=int, default=None, help="Only import a specific building ID")
    parser.add_argument("--meters", type=str, default=None,
                        help="Comma-separated meter IDs to import, e.g. '1,5,6,7,10,12,13'")
    parser.add_argument("--start-date", type=str, default=None,
                        help="Only import data after this date (inclusive), format YYYY-MM-DD")
    parser.add_argument("--end-date", type=str, default=None,
                        help="Only import data before this date (inclusive), format YYYY-MM-DD")
    parser.add_argument("--data-dir", default=None, help="Directory containing .h5 files")
    parser.add_argument("--force", action="store_true", help="Re-import even if dataset already exists")
    parser.add_argument("--idle-threshold", type=float, default=0,
                        help="Skip 15-min intervals where avg power is below this threshold (W). Default: 0")
    args = parser.parse_args()

    idle_threshold = args.idle_threshold
    meters_filter = None
    if args.meters:
        meters_filter = {int(m.strip()) for m in args.meters.split(",")}

    start_date = None
    if args.start_date:
        start_date = datetime.strptime(args.start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)

    end_date = None
    if args.end_date:
        end_date = datetime.strptime(args.end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=timezone.utc)

    full_path = resolve_data_path(args.filepath, args.data_dir)
    print(f"Resolved data path: {full_path}")
    import_h5_file(full_path, args.dataset, force=args.force, building_id_filter=args.building,
                   meters_filter=meters_filter, start_date=start_date, end_date=end_date,
                   idle_threshold=idle_threshold)


if __name__ == "__main__":
    main()
