from app.extensions import db


class Building(db.Model):
    __tablename__ = "buildings"

    id = db.Column(db.Integer, primary_key=True)
    dataset = db.Column(db.String(20), nullable=False)
    building_id = db.Column(db.Integer, nullable=False)
    metadata_json = db.Column(db.JSON)

    appliances = db.relationship("Appliance", backref="building", lazy="dynamic")
    data_entries = db.relationship("LoadData", backref="building", lazy="dynamic")

    __table_args__ = (db.UniqueConstraint("dataset", "building_id", name="uq_dataset_building"),)


class Appliance(db.Model):
    __tablename__ = "appliances"

    id = db.Column(db.Integer, primary_key=True)
    building_id = db.Column(db.Integer, db.ForeignKey("buildings.id"), nullable=False)
    meter_id = db.Column(db.Integer, nullable=False)
    appliance_type = db.Column(db.String(100))
    is_site_meter = db.Column(db.Boolean, default=False)
    device_model = db.Column(db.String(100))
    submeter_of = db.Column(db.Integer, default=0)

    data_entries = db.relationship("LoadData", backref="appliance", lazy="dynamic")

    __table_args__ = (
        db.UniqueConstraint("building_id", "meter_id", name="uq_building_meter"),
        db.Index("idx_appliance_building", "building_id"),
    )


class LoadData(db.Model):
    __tablename__ = "load_data"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    building_id = db.Column(db.Integer, db.ForeignKey("buildings.id"), nullable=False)
    appliance_id = db.Column(db.Integer, db.ForeignKey("appliances.id"), nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, index=True)
    power_watts = db.Column(db.Float, nullable=False)

    __table_args__ = (
        db.Index("idx_load_building_time", "building_id", "timestamp"),
        db.Index("idx_load_appliance_time", "appliance_id", "timestamp"),
    )


class LoadDataDaily(db.Model):
    __tablename__ = "load_data_daily"

    id = db.Column(db.BigInteger, primary_key=True, autoincrement=True)
    building_id = db.Column(db.Integer, db.ForeignKey("buildings.id"), nullable=False)
    appliance_id = db.Column(db.Integer, db.ForeignKey("appliances.id"), nullable=False)
    date = db.Column(db.Date, nullable=False)
    avg_power = db.Column(db.Float, nullable=False, default=0)
    min_power = db.Column(db.Float, nullable=False, default=0)
    max_power = db.Column(db.Float, nullable=False, default=0)
    total_energy = db.Column(db.Float, nullable=False, default=0)
    record_count = db.Column(db.Integer, nullable=False, default=0)

    __table_args__ = (
        db.Index("idx_daily_building_date", "building_id", "date"),
        db.Index("idx_daily_building_appliance_date", "building_id", "appliance_id", "date"),
    )
