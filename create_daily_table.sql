-- ============================================================
-- 1. 创建预聚合表 load_data_daily
-- ============================================================
CREATE TABLE IF NOT EXISTS load_data_daily (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    building_id INT NOT NULL,
    appliance_id INT NOT NULL,
    date DATE NOT NULL,
    avg_power FLOAT NOT NULL DEFAULT 0,
    min_power FLOAT NOT NULL DEFAULT 0,
    max_power FLOAT NOT NULL DEFAULT 0,
    total_energy FLOAT NOT NULL DEFAULT 0,
    record_count INT NOT NULL DEFAULT 0,
    INDEX idx_daily_building_date (building_id, date),
    INDEX idx_daily_building_appliance_date (building_id, appliance_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- 2. 从 load_data 聚合数据到 load_data_daily
--    将 ~600万条 15分钟记录 → ~16万条 天记录
-- ============================================================
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
ORDER BY building_id, appliance_id, date;

-- ============================================================
-- 3. 验证
-- ============================================================
SELECT 'load_data_daily 总记录数:' AS info, COUNT(*) AS cnt FROM load_data_daily
UNION ALL
SELECT 'load_data 原始表总记录数:', COUNT(*) FROM load_data
UNION ALL
SELECT '压缩比 (%):', ROUND((SELECT COUNT(*) FROM load_data_daily) * 100.0 / (SELECT COUNT(*) FROM load_data), 2);
