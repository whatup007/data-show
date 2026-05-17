import click
from flask.cli import with_appcontext
from app.extensions import db
from app.models.load_data import LoadData, LoadDataDaily


def register_commands(app):
    app.cli.add_command(populate_daily_cmd)
    app.cli.add_command(clear_cache_cmd)


@click.command("populate-daily")
@with_appcontext
def populate_daily_cmd():
    """从 load_data 原始表聚合数据到 load_data_daily 预聚合表"""
    click.echo("=" * 60)
    click.echo("开始填充预聚合表 load_data_daily ...")
    click.echo("=" * 60)

    # 1. 清空现有数据
    click.echo("[1/4] 清空现有预聚合数据...")
    deleted = db.session.query(LoadDataDaily).delete()
    db.session.commit()
    click.echo(f"  ✓ 已清空 {deleted} 条记录")

    # 2. 获取总记录数
    click.echo("[2/4] 统计原始数据...")
    total = db.session.query(db.func.count(LoadData.id)).scalar()
    click.echo(f"  ✓ load_data 表总计 {total:,.0f} 条记录")

    # 3. 执行聚合插入
    click.echo("[3/4] 执行聚合插入（按 building_id, appliance_id, DATE(timestamp) 分组）...")
    click.echo("  这可能需要几分钟，请耐心等待...")

    insert_sql = """
        INSERT INTO load_data_daily
            (building_id, appliance_id, date, avg_power, min_power, max_power, total_energy, record_count)
        SELECT
            building_id,
            appliance_id,
            DATE(timestamp) AS date,
            AVG(power_watts) AS avg_power,
            MIN(power_watts) AS min_power,
            MAX(power_watts) AS max_power,
            SUM(power_watts) AS total_energy,
            COUNT(*) AS record_count
        FROM load_data
        GROUP BY building_id, appliance_id, DATE(timestamp)
        ORDER BY building_id, appliance_id, date
    """

    result = db.session.execute(db.text(insert_sql))
    db.session.commit()
    inserted = result.rowcount

    click.echo(f"  ✓ 已插入 {inserted:,.0f} 条预聚合记录")

    # 4. 验证
    click.echo("[4/4] 验证预聚合数据...")
    verify_count = db.session.query(db.func.count(LoadDataDaily.id)).scalar()
    verify_buildings = db.session.query(
        LoadDataDaily.building_id, db.func.count(db.distinct(LoadDataDaily.date))
    ).group_by(LoadDataDaily.building_id).all()

    click.echo(f"  ✓ load_data_daily 表总计 {verify_count:,.0f} 条记录")
    click.echo(f"  ✓ 数据分布:")
    for building_id, days in verify_buildings:
        click.echo(f"    - Building {building_id}: {days} 天数据")

    click.echo("=" * 60)
    click.echo("填充完成！请重启 gunicorn 使缓存生效。")
    click.echo("=" * 60)


@click.command("clear-api-cache")
@with_appcontext
def clear_cache_cmd():
    """清空 API 内存缓存"""
    import app.routes.api as api_module
    api_module._cache.clear()
    click.echo("✓ API 缓存已清空")
