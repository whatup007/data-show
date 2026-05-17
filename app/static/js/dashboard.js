/* Dashboard Business Logic */
(function () {
  var lang = (navigator.language || navigator.userLanguage || "en").substring(0, 2);
  var isChinese = (lang === "zh");

  var i18nMap = {
    trendTitle: { zh: "功率消耗趋势", en: "Power Consumption Trend" },
    applianceDistTitle: { zh: "电器能耗分布", en: "Appliance Distribution" },
    statsOverview: { zh: "统计概览", en: "Statistics Overview" },
    building: { zh: "建筑", en: "Building" },
    appliance: { zh: "电器", en: "Appliance" },
    timeRange: { zh: "时间范围", en: "Time Range" },
    hour: { zh: "时", en: "Hour" },
    day: { zh: "日", en: "Day" },
    week: { zh: "周", en: "Week" },
    apply: { zh: "应用", en: "Apply" },
    totalRecords: { zh: "总记录数", en: "Total Records" },
    avgPower: { zh: "平均功率", en: "Avg Power" },
    minPower: { zh: "最小功率", en: "Min Power" },
    maxPower: { zh: "最大功率", en: "Max Power" },
    totalEnergy: { zh: "总能耗", en: "Total Energy" },
    totalDevices: { zh: "设备数", en: "Devices" },
    typeDistTitle: { zh: "类型占比", en: "Type Distribution" },
    allAppliances: { zh: "所有电器 (总表)", en: "All Appliances (Main)" },
    loading: { zh: "加载中...", en: "Loading..." },
    ready: { zh: "准备就绪", en: "Ready" },
    updated: { zh: "已更新", en: "Updated" },
    loadFailed: { zh: "加载失败", en: "Load Failed" },
    noData: { zh: "暂无数据", en: "No Data" },
    applianceStatus: { zh: "电器运行状况", en: "Appliance Status" },
    activationCount: { zh: "启用次数", en: "Activations" },
    type: { zh: "类型", en: "Type" },
    modelPlaceholder: { zh: "3D 房屋模型加载中...", en: "3D Building Model Loading..." },
    clickRoomTip: { zh: "点击上方房间查看电器数据", en: "Click a room to view appliance data" },
    roomLounge: { zh: "客厅", en: "Lounge" },
    roomKitchen: { zh: "厨房", en: "Kitchen" },
    roomUtility: { zh: "杂物间", en: "Utility" },
    roomHall: { zh: "门厅", en: "Hall" },
    roomBathroom: { zh: "浴室", en: "Bathroom" },
    roomStudy: { zh: "书房", en: "Study" },
    roomBedroom1: { zh: "主卧", en: "Master Bedroom" },
    roomBedroom2: { zh: "次卧", en: "Kid's Bedroom" },
    roomAppliances: { zh: "房间电器", en: "Room Appliances" },
    editLayout: { zh: "编辑户型", en: "Edit Layout" },
    addRoom: { zh: "添加房间", en: "Add Room" },
    deleteRoom: { zh: "删除", en: "Delete" },
    saveLayout: { zh: "保存方案", en: "Save" },
    resetLayout: { zh: "恢复默认", en: "Reset" },
    roomDining: { zh: "餐厅", en: "Dining" },
    roomGarage: { zh: "车库", en: "Garage" },
    roomCustom: { zh: "自定义", en: "Custom" },
    editorTitle: { zh: "户型编辑器", en: "Floor Plan Editor" },
    roomTypeLabel: { zh: "房间属性", en: "Properties" },
    closeEditor: { zh: "关闭", en: "Close" },
    noRoomSelected: { zh: "点击房间进行编辑", en: "Click a room to edit" },
    roomWidth: { zh: "宽度", en: "Width" },
    roomHeight: { zh: "高度", en: "Height" },
    settings: { zh: "设置", en: "Settings" },
    floorplanPreset: { zh: "户型方案", en: "Floor Plan" },
    presetDefault: { zh: "默认 (8间)", en: "Default (8 Rooms)" },
    presetSmallApt: { zh: "小户型公寓", en: "Small Apartment" },
    preset3Bed: { zh: "标准三居室", en: "Standard 3-Bedroom" },
    presetFlat: { zh: "大平层", en: "Large Flat" },
    presetTownhouse: { zh: "联排别墅", en: "Townhouse" },
    presetStudio: { zh: "开放式工作室", en: "Open Studio" },
  };

  var datasetNames = {
    zh: {
      A: "住宅区 A", B: "住宅区 B", C: "住宅区 C", D: "住宅区 D", E: "住宅区 E",
      F: "住宅区 F", G: "住宅区 G", H: "住宅区 H", I: "住宅区 I", J: "住宅区 J",
    },
    en: {
      A: "District A", B: "District B", C: "District C", D: "District D", E: "District E",
      F: "District F", G: "District G", H: "District H", I: "District I", J: "District J",
    },
  };

  var applianceNames = {
    zh: {
      "light": "电灯", "radio": "收音机", "audio system": "音响系统",
      "television": "电视", "tv": "电视",
      "tablet computer charger": "平板充电器",
      "oven": "烤箱", "laptop computer": "笔记本电脑",
      "fridge freezer": "冰箱冰柜", "fridge": "冰箱",
      "soldering iron": "电烙铁", "hair dryer": "吹风机", "fan": "风扇",
      "htpc": "家庭影院电脑", "audio amplifier": "音频放大器",
      "baby monitor": "婴儿监视器",
      "dish washer": "洗碗机", "dishwasher": "洗碗机",
      "computer monitor": "电脑显示器", "vacuum cleaner": "吸尘器",
      "clothes iron": "电熨斗", "solar thermal pumping station": "太阳能热循环泵",
      "food processor": "食品加工机", "bouncy castle pump": "充气城堡泵",
      "coffee maker": "咖啡机", "desktop computer": "台式电脑",
      "breadmaker": "面包机", "active subwoofer": "有源低音炮",
      "external hard disk": "移动硬盘",
      "washer dryer": "洗衣机/烘干机", "washer": "洗衣机", "dryer": "烘干机",
      "microwave": "微波炉", "usb hub": "USB集线器",
      "hair straighteners": "直发器", "printer": "打印机",
      "boiler": "锅炉", "toasted sandwich maker": "三明治机",
      "broadband router": "宽带路由器", "mobile phone charger": "手机充电器",
      "charger": "充电器",
      "furnace": "暖气炉", "heat pump": "热泵",
      "safety": "安防设备", "smoke alarm": "烟雾报警器", "solar": "太阳能",
      "water heater": "热水器",
      "lighting": "照明", "hvac": "暖通空调", "ev charger": "电动车充电器",
      "pool pump": "泳池水泵", "jacuzzi": "按摩浴缸",
      "entertainment": "娱乐设备", "home office": "家庭办公",
      "garage": "车库", "basement": "地下室",
      "kettle": "电水壶", "freezer": "冰柜", "computer": "电脑",
      "lamp": "台灯", "wall switch": "墙壁开关", "security": "安防",
      "cooker": "灶具", "toaster": "烤面包机", "fans": "风扇",
      "unknown": "未知",
      "games console": "游戏机", "set top box": "机顶盒",
      "active speaker": "有源音箱", "rice cooker": "电饭煲",
      "washing machine": "洗衣机", "running machine": "跑步机",
      "modem": "调制解调器", "network attached storage": "网络存储",
      "server computer": "服务器", "electric oven": "电烤箱",
      "electric space heater": "电暖器", "projector": "投影仪",
      "ethernet switch": "交换机", "clock alarm": "闹钟",
      "kitchen aid": "厨房料理机",
      "wireless phone charger": "无线充电器",
      "water pump": "水泵", "security alarm": "防盗报警器",
      "immersion heater": "浸入式加热器",
      "electric stove": "电炉",
    },
    en: {
      "light": "Light", "radio": "Radio", "audio system": "Audio System",
      "television": "TV", "tv": "TV",
      "tablet computer charger": "Tablet Charger",
      "oven": "Oven", "laptop computer": "Laptop",
      "fridge freezer": "Fridge Freezer", "fridge": "Fridge",
      "soldering iron": "Soldering Iron", "hair dryer": "Hair Dryer", "fan": "Fan",
      "htpc": "HTPC", "audio amplifier": "Audio Amplifier",
      "baby monitor": "Baby Monitor",
      "dish washer": "Dish Washer", "dishwasher": "Dishwasher",
      "computer monitor": "Monitor", "vacuum cleaner": "Vacuum Cleaner",
      "clothes iron": "Clothes Iron",
      "solar thermal pumping station": "Solar Thermal Pump",
      "food processor": "Food Processor", "bouncy castle pump": "Bouncy Castle Pump",
      "coffee maker": "Coffee Maker", "desktop computer": "Desktop",
      "breadmaker": "Bread Maker", "active subwoofer": "Active Subwoofer",
      "external hard disk": "External HDD",
      "washer dryer": "Washer/Dryer", "washer": "Washer", "dryer": "Dryer",
      "microwave": "Microwave", "usb hub": "USB Hub",
      "hair straighteners": "Hair Straighteners", "printer": "Printer",
      "boiler": "Boiler", "toasted sandwich maker": "Sandwich Maker",
      "broadband router": "Broadband Router",
      "mobile phone charger": "Phone Charger", "charger": "Charger",
      "furnace": "Furnace", "heat pump": "Heat Pump",
      "safety": "Safety", "smoke alarm": "Smoke Alarm", "solar": "Solar",
      "water heater": "Water Heater",
      "lighting": "Lighting", "hvac": "HVAC", "ev charger": "EV Charger",
      "pool pump": "Pool Pump", "jacuzzi": "Jacuzzi",
      "entertainment": "Entertainment", "home office": "Home Office",
      "garage": "Garage", "basement": "Basement",
      "kettle": "Kettle", "freezer": "Freezer", "computer": "Computer",
      "lamp": "Lamp", "phone charger": "Phone Charger",
      "wall switch": "Wall Switch", "security": "Security",
      "cooker": "Cooker", "toaster": "Toaster", "fans": "Fans",
      "unknown": "Unknown",
      "games console": "Games Console", "set top box": "Set Top Box",
      "active speaker": "Active Speaker", "rice cooker": "Rice Cooker",
      "washing machine": "Washing Machine", "running machine": "Running Machine",
      "modem": "Modem", "network attached storage": "NAS",
      "server computer": "Server", "electric oven": "Electric Oven",
      "electric space heater": "Electric Heater", "projector": "Projector",
      "ethernet switch": "Ethernet Switch", "clock alarm": "Clock Alarm",
      "kitchen aid": "Kitchen Aid",
      "wireless phone charger": "Wireless Charger",
      "water pump": "Water Pump", "security alarm": "Security Alarm",
      "immersion heater": "Immersion Heater",
      "electric stove": "Electric Stove",
    },
  };

  function t(key) {
    if (!i18nMap[key]) return key;
    return i18nMap[key][isChinese ? "zh" : "en"] || i18nMap[key].en;
  }
  window.t = t;

  function translatePage() {
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.dataset.i18n;
      el.textContent = t(key);
    });
    if (typeof refreshThreeLabels === "function") refreshThreeLabels();
  }

  function translateApplianceType(type, meterId) {
    if (!type || type === "unknown") {
      if (meterId) {
        return isChinese ? "电表 " + meterId : "Meter " + meterId;
      }
      return isChinese ? "未知" : "Unknown";
    }
    var lower = type.toLowerCase().trim();
    var dict = applianceNames[isChinese ? "zh" : "en"];
    if (dict[lower]) {
      return dict[lower];
    }
    for (var key in dict) {
      if (lower === key) {
        return dict[key];
      }
    }
    for (var key in dict) {
      if (lower.indexOf(key) !== -1 || key.indexOf(lower) !== -1) {
        return dict[key];
      }
    }
    if (meterId) {
      return isChinese ? "电器 " + meterId : "Appliance " + meterId;
    }
    return isChinese ? "未知电器" : "Unknown Appliance";
  }

  function getBuildingDisplayName(dataset, buildingId) {
    var nameMap = isChinese ? datasetNames.zh : datasetNames.en;
    var dsName = nameMap[dataset.toUpperCase()] || dataset.toUpperCase();
    if (isChinese) {
      return dsName + " - " + buildingId + "号楼";
    }
    return dsName + " - Building " + buildingId;
  }

  var buildings = [];
  var appliances = [];
  var dataEndTime = null;
  var dataStartTime = null;
  var isCustomRange = false;

  var powerChart = null;
  var chartLeft = null;
  var chartRight = null;

  var buildingSelect = document.getElementById("buildingSelect");
  var applianceSelect = document.getElementById("applianceSelect");
  var statusIndicator = document.getElementById("statusIndicator");
  var statusText = document.getElementById("statusText");
  var startDateInput = document.getElementById("startDateInput");
  var endDateInput = document.getElementById("endDateInput");
  var dateApplyBtn = document.getElementById("dateApplyBtn");

  translatePage();

  function setStatus(text, type) {
    statusText.textContent = text;
    statusIndicator.className = "status-indicator " + type;
  }

  function toLocalDateString(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, "0");
    var d = String(date.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + d;
  }

  function getSelectedBuildingId() {
    var v = buildingSelect.value;
    return v ? parseInt(v) : null;
  }

  function getSelectedApplianceId() {
    var v = applianceSelect.value;
    return v ? parseInt(v) : null;
  }

  function getActiveTimeRange() {
    var btn = document.querySelector(".dt-btn[data-days].active");
    if (!btn) return 7;
    if (btn.dataset.days === "custom") return "custom";
    return parseInt(btn.dataset.days);
  }
  function getActiveInterval() {
    var btn = document.querySelector(".dt-btn[data-interval].active");
    return btn ? btn.dataset.interval : "hour";
  }

  function calcTimeSpanDays(start, end) {
    if (!start || !end) return 0;
    return (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
  }

  function suggestInterval(timeSpanDays) {
    if (timeSpanDays <= 1) return "15min";
    if (timeSpanDays <= 3) return "hour";
    if (timeSpanDays <= 90) return "day";
    if (timeSpanDays <= 365) return "week";
    return "month";
  }

  function getTimeParams() {
    var days = getActiveTimeRange();
    var start = null;
    var end = null;

    if (days === "custom") {
      var s = startDateInput.value;
      var e = endDateInput.value;
      if (s && e) {
        start = new Date(s + "T00:00:00");
        end = new Date(e + "T23:59:59");
      }
      return { start: start, end: end };
    }

    if (days > 0) {
      end = dataEndTime || new Date();
      start = dataEndTime
        ? new Date(dataEndTime.getTime() - days * 24 * 60 * 60 * 1000)
        : new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    }
    return { start: start, end: end };
  }

  function autoAdjustInterval() {
    var timeParams = getTimeParams();
    if (!timeParams.start || !timeParams.end) return;
    var spanDays = calcTimeSpanDays(timeParams.start, timeParams.end);
    var suggested = suggestInterval(spanDays);
    var currentBtn = document.querySelector(".dt-btn[data-interval].active");
    var currentInterval = currentBtn ? currentBtn.dataset.interval : "hour";
    if (currentInterval !== suggested) {
      document.querySelectorAll(".dt-btn[data-interval]").forEach(function (b) {
        b.classList.toggle("active", b.dataset.interval === suggested);
      });
    }
  }

  function getTimeParamsForApi() {
    var p = getTimeParams();
    var params = "";
    if (p.start) params += "&start=" + p.start.toISOString();
    if (p.end) params += "&end=" + p.end.toISOString();
    return params;
  }

  function loadBuildings() {
    fetch("/api/buildings")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        buildings = data;
        buildingSelect.innerHTML = "";
        if (data.length === 0) {
          buildingSelect.innerHTML = '<option value="">' + t("noData") + '</option>';
          return;
        }
        data.forEach(function (b) {
          var opt = document.createElement("option");
          opt.value = b.id;
          opt.textContent = getBuildingDisplayName(b.dataset, b.building_id);
          buildingSelect.appendChild(opt);
        });
        buildingSelect.value = data[0].id;
        loadAppliances();
      })
      .catch(function (err) {
        console.error("Failed to load buildings:", err);
        buildingSelect.innerHTML = '<option value="">' + t("loadFailed") + '</option>';
        setStatus(t("loadFailed"), "loading");
      });
  }

  function loadAppliances() {
    var buildingId = getSelectedBuildingId();
    if (!buildingId) return;
    applianceSelect.innerHTML = '<option value="">' + t("allAppliances") + '</option>';
    fetch("/api/buildings/" + buildingId + "/appliances")
      .then(function (r) { return r.json(); })
      .then(function (data) {
        appliances = data;
        data.forEach(function (a) {
          var opt = document.createElement("option");
          opt.value = a.id;
          var label = translateApplianceType(a.appliance_type, a.meter_id);
          if (a.is_site_meter) {
            label += isChinese ? " (总表)" : " (Main)";
          }
          opt.textContent = label;
          applianceSelect.appendChild(opt);
        });
        loadSummary();
        loadFloorPlan();
      })
      .catch(function (err) {
        console.error("Failed to load appliances:", err);
        setStatus(t("loadFailed"), "loading");
      });
  }

  function loadFloorPlan() {
    if (typeof renderFloorPlan === "function") {
      renderFloorPlan(null);
    }
  }

  function loadApplianceDist() {
    var buildingId = getSelectedBuildingId();
    if (!buildingId) return;
    var timeParams = getTimeParamsForApi();
    fetch("/api/statistics/appliance-distribution?building_id=" + buildingId + timeParams)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        renderRightChart(data);
        renderLeftChart(data);
      })
      .catch(function (err) {
        console.error("Failed to load appliance distribution:", err);
      });
  }

  function loadApplianceStatus() {
    var buildingId = getSelectedBuildingId();
    if (!buildingId) return;
    var timeParams = getTimeParamsForApi();
    fetch("/api/statistics/appliance-status?building_id=" + buildingId + timeParams)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var tbody = document.getElementById("statusBody");
        if (!data || data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:rgba(255,255,255,.3)">' + t("noData") + '</td></tr>';
          return;
        }
        var html = "";
        data.forEach(function (a, i) {
          var idx = i + 1;
          var name = translateApplianceType(a.appliance_type, a.meter_id);
          if (a.is_site_meter) {
            name += isChinese ? " (总表)" : " (Main)";
          }
          var typeLabel = a.is_site_meter
            ? (isChinese ? "总表" : "Main")
            : (isChinese ? "分表" : "Sub");
          html += '<tr><td><span class="rank-num">' + idx + '</span></td><td>' + name + '</td><td>' + typeLabel + '</td><td>' + a.activation_count + '</td></tr>';
        });
        tbody.innerHTML = html;
      })
      .catch(function (err) {
        console.error("Failed to load appliance status:", err);
      });
  }

  var selectedRoom = null;
  var roomDataCache = {};

  function positionPanel(x, y) {
    var panel = document.getElementById("roomDetailPanel");
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var pw = 240;
    var ph = 280;
    var pad = 20;

    var left = x + pad;
    var top = y - ph / 2;

    if (left + pw > vw - pad) left = x - pw - pad;
    if (top < pad) top = pad;
    if (top + ph > vh - pad) top = vh - ph - pad;

    panel.style.left = left + "px";
    panel.style.top = top + "px";
  }

  function loadRoomData(roomKey, roomName, clientX, clientY) {
    var buildingId = getSelectedBuildingId();
    if (!buildingId) {
      document.getElementById("roomDetailTitle").textContent = isChinese ? "请先选择建筑" : "Select a building first";
      document.getElementById("roomDetailContent").innerHTML = "";
      return;
    }

    var detailPanel = document.getElementById("roomDetailPanel");
    var titleEl = document.getElementById("roomDetailTitle");
    var contentEl = document.getElementById("roomDetailContent");

    if (typeof clearThreeActive === "function") clearThreeActive();
    if (typeof setThreeActive === "function") setThreeActive(roomName);

    var lookupKey = "room" + roomKey.charAt(0).toUpperCase() + roomKey.slice(1).replace(/_([a-z])/g, function (_, c) { return c.toUpperCase(); });
    var roomLabel = isChinese ? (i18nMap[lookupKey] || i18nMap["room" + roomName.charAt(0).toUpperCase() + roomName.slice(1)] || {}).zh : (i18nMap[lookupKey] || i18nMap["room" + roomName.charAt(0).toUpperCase() + roomName.slice(1)] || {}).en;
    roomLabel = roomLabel || roomKey.charAt(0).toUpperCase() + roomKey.slice(1).replace(/_/g, " ");
    titleEl.textContent = roomLabel;
    contentEl.innerHTML = '<div class="room-no-data">' + t("loading") + '</div>';

    if (clientX !== undefined && clientY !== undefined) {
      positionPanel(clientX, clientY);
    }
    detailPanel.classList.add("visible");

    if (roomDataCache[roomKey]) {
      renderRoomDetail(roomKey, roomLabel);
      return;
    }

    var timeParams = getTimeParamsForApi();
    var url = "/api/load-data/by-room?building_id=" + buildingId + "&room=" + roomName + timeParams;
    console.log("[RoomData] fetching:", url);
    fetch(url)
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        console.log("[RoomData] response for", roomKey, ":", data);
        roomDataCache[roomKey] = data || [];
        renderRoomDetail(roomKey, roomLabel);
      })
      .catch(function (err) {
        console.error("[RoomData] error:", err);
        contentEl.innerHTML = '<div class="room-no-data">' + t("loadFailed") + '</div>';
      });
  }

  window.loadRoomData = loadRoomData;

  function renderRoomDetail(roomKey, roomLabel) {
    var contentEl = document.getElementById("roomDetailContent");
    var data = roomDataCache[roomKey] || [];

    if (!data || data.length === 0) {
      contentEl.innerHTML = '<div class="room-no-data">' + t("noData") + '</div>';
      return;
    }

    var html = "";
    data.forEach(function (app) {
      var name = translateApplianceType(app.appliance_type, app.meter_id);
      var energy = app.energy_kwh !== undefined ? app.energy_kwh.toFixed(2) + " kWh" : "--";
      html += '<div class="room-appliance-item">' +
        '<span class="room-appliance-name">' + name + '</span>' +
        '<span class="room-appliance-power">' + energy + '</span>' +
        '</div>';
    });
    contentEl.innerHTML = html;
  }

  function renderLeftChart(data) {
    if (!data || data.length === 0) return;
    var topData = data.slice(0, 8);
    var names = topData.map(function (d) { return translateApplianceType(d.type) || d.type; });
    var values = topData.map(function (d) { return Number((d.total_energy / 1000).toFixed(2)); });

    if (!chartLeft) {
      chartLeft = echarts.init(document.getElementById("chartLeft"), "dark");
    }

    chartLeft.setOption({
      backgroundColor: "transparent",
      animationDuration: 1200,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(8, 14, 38, 0.92)",
        borderColor: "rgba(56, 189, 248, 0.12)",
        borderWidth: 1,
        textStyle: { color: "#EEF2FF", fontSize: 10 },
        extraCssText: "backdrop-filter:blur(18px);border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.4),0 0 20px rgba(56,189,248,0.05);",
        formatter: function (params) {
          var p = params[0];
          return "<div style='font-weight:600;color:#EEF2FF;letter-spacing:0.5px;'>" + p.name + "</div>" +
            "<div style='color:rgba(238,242,255,0.45);font-size:10px;margin-top:4px;'>" + (isChinese ? "能耗: " : "Energy: ") +
            "<strong style='color:#EEF2FF;'>" + p.value + " kWh</strong></div>";
        },
      },
      grid: { left: 8, right: 8, top: 8, bottom: 8, containLabel: true },
      xAxis: { show: false },
      yAxis: {
        type: "category",
        data: names.reverse(),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "rgba(238,242,255,0.20)", fontSize: 8 },
      },
      series: [{
        type: "bar",
        data: values.reverse().map(function (v, i) {
          return {
            value: v,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                { offset: 0, color: "rgba(14, 165, 233, 0.30)" },
                { offset: 0.5, color: "rgba(6, 182, 212, 0.55)" },
                { offset: 1, color: "rgba(14, 165, 233, 0.70)" },
              ]),
              borderRadius: [0, 4, 4, 0],
              shadowColor: "rgba(6, 182, 212, 0.35)",
              shadowBlur: 10,
              shadowOffsetX: 2,
            },
          };
        }),
        barWidth: 6,
        barCategoryGap: "45%",
        label: {
          show: true,
          position: "right",
          color: "rgba(238,242,255,0.25)",
          fontSize: 7,
          formatter: function (p) { return p.value + " kWh"; },
        },
      }],
    }, true);
  }

  function renderRightChart(data) {
    if (!data || data.length === 0) return;
    var topData = data.slice(0, 6);
    var otherEnergy = 0;
    if (data.length > 6) {
      for (var i = 6; i < data.length; i++) {
        otherEnergy += data[i].total_energy;
      }
    }
    var chartData = topData.map(function (d) {
      return {
        name: translateApplianceType(d.type) || d.type,
        value: Number(d.total_energy.toFixed(2)),
      };
    });
    if (otherEnergy > 0) {
      chartData.push({ name: isChinese ? "其他" : "Other", value: Number(otherEnergy.toFixed(2)) });
    }

    if (!chartRight) {
      chartRight = echarts.init(document.getElementById("chartRight"), "dark");
    }

    chartRight.setOption({
      backgroundColor: "transparent",
      animationDuration: 1500,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(8, 14, 38, 0.92)",
        borderColor: "rgba(56, 189, 248, 0.12)",
        borderWidth: 1,
        textStyle: { color: "#EEF2FF", fontSize: 10 },
        extraCssText: "backdrop-filter:blur(18px);border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.4),0 0 20px rgba(56,189,248,0.05);",
        formatter: function (p) {
          return "<div style='font-weight:600;color:#EEF2FF;letter-spacing:0.5px;'>" + p.name + "</div>" +
            "<div style='color:rgba(238,242,255,0.45);font-size:10px;margin-top:4px;'>" + (isChinese ? "能耗: " : "Energy: ") +
            "<strong style='color:#EEF2FF;'>" + p.value.toFixed(1) + " W</strong> (" + p.percent + "%)</div>";
        },
      },
      series: [{
        type: "pie",
        radius: ["38%", "65%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 4,
          borderColor: "rgba(8, 14, 38, 0.6)",
          borderWidth: 2,
          shadowColor: "rgba(6, 182, 212, 0.25)",
          shadowBlur: 12,
        },
        label: {
          show: true,
          color: "rgba(238,242,255,0.30)",
          fontSize: 8,
          formatter: function (p) { return p.name; },
        },
        labelLine: {
          lineStyle: { color: "rgba(14, 165, 233, 0.12)" },
        },
        emphasis: {
          itemStyle: {
            shadowColor: "rgba(6, 182, 212, 0.40)",
            shadowBlur: 20,
          },
        },
        data: chartData.map(function (d, i) {
          var colors = [
            ["rgba(14, 165, 233, 0.75)", "rgba(6, 182, 212, 0.55)"],
            ["rgba(99, 102, 241, 0.70)", "rgba(139, 92, 246, 0.50)"],
            ["rgba(6, 182, 212, 0.65)", "rgba(14, 165, 233, 0.45)"],
            ["rgba(139, 92, 246, 0.65)", "rgba(99, 102, 241, 0.45)"],
            ["rgba(14, 165, 233, 0.60)", "rgba(6, 182, 212, 0.40)"],
            ["rgba(99, 102, 241, 0.55)", "rgba(139, 92, 246, 0.35)"],
            ["rgba(6, 182, 212, 0.50)", "rgba(14, 165, 233, 0.30)"],
          ];
          return {
            name: d.name,
            value: d.value,
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 1, 1, [
                { offset: 0, color: colors[i % colors.length][0] },
                { offset: 1, color: colors[i % colors.length][1] },
              ]),
            },
          };
        }),
      }],
    }, true);
  }

  function animateNumber(el, target, suffix, duration) {
    var start = parseFloat(el.textContent.replace(/[^\d.-]/g, '')) || 0;
    var startTime = null;
    if (Math.abs(start - target) < 0.01) return;

    el.classList.add('animating');
    
    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      var progress = Math.min((timestamp - startTime) / duration, 1);
      var eased = 1 - Math.pow(1 - progress, 4);
      var current = start + (target - start) * eased;
      
      var displayValue;
      if (typeof target === 'number' && !Number.isInteger(target)) {
        displayValue = current.toFixed(1);
      } else {
        displayValue = Math.round(current).toLocaleString();
      }
      
      el.textContent = displayValue + (suffix || '');
      el.setAttribute('data-value', current.toFixed(2));
      
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.classList.remove('animating');
      }
    }
    requestAnimationFrame(step);
  }

  function loadSummary() {
    var buildingId = getSelectedBuildingId();
    if (!buildingId) return;
    var applianceId = getSelectedApplianceId();
    var params = "?building_id=" + buildingId;
    if (applianceId) params += "&appliance_id=" + applianceId;

    setStatus(t("loading"), "loading");

    fetch("/api/load-data/summary" + params)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        animateNumber(document.getElementById("statRecords"), data.total_records, "", 800);
        animateNumber(document.getElementById("statRecords2"), appliances.length || 0, "", 800);

        var avgEl = document.getElementById("statAvgPower");
        var avgVal = data.avg_power ? parseFloat(data.avg_power.toFixed(1)) : 0;
        animateNumber(avgEl, avgVal, " W", 800);

        var minEl = document.getElementById("statMinPower");
        var minVal = data.min_power ? parseFloat(data.min_power.toFixed(1)) : 0;
        animateNumber(minEl, minVal, " W", 800);

        var maxEl = document.getElementById("statMaxPower");
        var maxVal = data.max_power ? parseFloat(data.max_power.toFixed(1)) : 0;
        animateNumber(maxEl, maxVal, " W", 800);

        var energyKwh = data.total_energy ? parseFloat((data.total_energy / 1000).toFixed(2)) : 0;
        animateNumber(document.getElementById("statEnergy"), energyKwh, " kWh", 800);

        if (data.start_time && data.end_time) {
          dataStartTime = new Date(data.start_time);
          dataEndTime = new Date(data.end_time);
          if (!isCustomRange) {
            startDateInput.value = toLocalDateString(dataStartTime);
            endDateInput.value = toLocalDateString(dataEndTime);
          }
        }

        setStatus(t("updated"), "loaded");
        loadChartData();
        loadApplianceDist();
        loadApplianceStatus();
      })
      .catch(function (err) {
        console.error("Failed to load summary:", err);
        setStatus(t("loadFailed"), "loading");
      });
  }

  function loadChartData() {
    var buildingId = getSelectedBuildingId();
    if (!buildingId) return;

    autoAdjustInterval();

    var applianceId = getSelectedApplianceId();
    var interval = getActiveInterval();
    var timeParams = getTimeParams();

    var params = "?building_id=" + buildingId + "&interval=" + interval;
    if (applianceId) params += "&appliance_id=" + applianceId;
    if (timeParams.start) params += "&start=" + timeParams.start.toISOString();
    if (timeParams.end) params += "&end=" + timeParams.end.toISOString();

    setStatus(t("loading"), "loading");

    fetch("/api/load-data" + params)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        renderChart(data);
        setStatus(t("updated"), "loaded");
      })
      .catch(function (err) {
        console.error("Failed to load chart data:", err);
        setStatus(t("loadFailed"), "loading");
      });
  }

  function renderChart(data) {
    if (!powerChart) {
      powerChart = echarts.init(document.getElementById("powerChart"), "dark");
    }

    var timestamps = data.map(function (d) { return d.timestamp; });
    var avgValues = data.map(function (d) { return d.avg_power; });
    var maxValues = data.map(function (d) { return d.max_power; });
    var minValues = data.map(function (d) { return d.min_power; });

    var option = {
      backgroundColor: "transparent",
      animationDuration: 1500,
      animationEasing: "cubicOut",
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(8, 14, 38, 0.92)",
        borderColor: "rgba(56, 189, 248, 0.12)",
        borderWidth: 1,
        textStyle: { color: "#EEF2FF", fontSize: 10 },
        extraCssText: "backdrop-filter:blur(18px);border-radius:10px;box-shadow:0 8px 32px rgba(0,0,0,0.4),0 0 20px rgba(56,189,248,0.05);",
        formatter: function (params) {
          var html = "<div style='font-weight:600;margin-bottom:8px;color:#EEF2FF;font-size:11px;letter-spacing:0.5px;'>" + params[0].axisValue + "</div>";
          params.forEach(function (p) {
            html += "<div style='display:flex;align-items:center;gap:8px;margin:4px 0'>" +
              "<span style='display:inline-block;width:6px;height:6px;border-radius:50%;background:" + p.color + ";box-shadow:0 0 8px " + p.color + ";'></span>" +
              "<span style='color:rgba(238,242,255,0.50);font-size:10px'>" + p.seriesName + ":</span> " +
              "<strong style='color:#EEF2FF;font-size:11px;letter-spacing:0.5px;'>" + p.value + " W</strong></div>";
          });
          return html;
        },
      },
      legend: {
        data: isChinese ? ["平均功率", "最大功率", "最小功率"] : ["Avg Power", "Max Power", "Min Power"],
        textStyle: { color: "rgba(238,242,255,0.25)", fontSize: 8 },
        top: 2,
        right: 0,
        icon: "circle",
        itemWidth: 5,
        itemHeight: 5,
        itemGap: 12,
      },
      grid: {
        left: 36,
        right: 8,
        top: 22,
        bottom: 28,
      },
      xAxis: {
        type: "category",
        data: timestamps,
        boundaryGap: false,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: "rgba(238,242,255,0.12)",
          fontSize: 8,
          rotate: timestamps.length > 50 ? 30 : 0,
        },
        splitLine: { show: false },
      },
      yAxis: {
        type: "value",
        name: isChinese ? "功率 (W)" : "Power (W)",
        nameTextStyle: { color: "rgba(238,242,255,0.10)", fontSize: 8 },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: "rgba(238,242,255,0.12)", fontSize: 8 },
        splitLine: {
          lineStyle: { color: "rgba(56, 189, 248, 0.015)", type: "dashed" },
        },
      },
      dataZoom: [
        { type: "inside", start: 0, end: 100, minValueSpan: 10 },
        {
          type: "slider", start: 0, end: 100, height: 6, bottom: 4,
          borderColor: "rgba(56, 189, 248, 0.03)",
          backgroundColor: "rgba(255,255,255,0.003)",
          fillerColor: "rgba(56, 189, 248, 0.08)",
          handleStyle: { color: "rgba(56, 189, 248, 0.20)", borderWidth: 0 },
          textStyle: { color: "rgba(238,242,255,0.10)", fontSize: 7 },
          selectedDataBackground: { lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 } },
          dataBackground: { lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 } },
        },
      ],
      series: [
        {
          name: isChinese ? "平均功率" : "Avg Power",
          type: "line",
          data: avgValues,
          smooth: 0.6,
          symbol: "none",
          lineStyle: {
            width: 2.5,
            color: {
              type: "linear", x: 0, y: 0, x2: 1, y2: 0,
              colorStops: [
                { offset: 0, color: "#0EA5E9" },
                { offset: 0.5, color: "#06B6D4" },
                { offset: 1, color: "#0EA5E9" },
              ],
            },
            shadowColor: "rgba(6, 182, 212, 0.50)",
            shadowBlur: 16,
            shadowOffsetY: 2,
          },
          itemStyle: { color: "#06B6D4" },
          areaStyle: {
            color: {
              type: "linear", x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: "rgba(6, 182, 212, 0.35)" },
                { offset: 0.3, color: "rgba(14, 165, 233, 0.18)" },
                { offset: 0.7, color: "rgba(14, 165, 233, 0.06)" },
                { offset: 1, color: "rgba(14, 165, 233, 0)" },
              ],
            },
          },
          z: 3,
        },
        {
          name: isChinese ? "最大功率" : "Max Power",
          type: "line",
          data: maxValues,
          smooth: 0.6,
          symbol: "none",
          lineStyle: { width: 1.5, color: "rgba(14, 165, 233, 0.35)", type: "dashed" },
          itemStyle: { color: "rgba(14, 165, 233, 0.35)" },
          z: 1,
        },
        {
          name: isChinese ? "最小功率" : "Min Power",
          type: "line",
          data: minValues,
          smooth: 0.6,
          symbol: "none",
          lineStyle: { width: 1.5, color: "rgba(139, 92, 246, 0.35)", type: "dashed" },
          itemStyle: { color: "rgba(139, 92, 246, 0.35)" },
          z: 1,
        },
      ],
    };

    powerChart.setOption(option, true);
  }

  document.querySelectorAll(".dt-btn[data-days]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".dt-btn[data-days]").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      if (btn.dataset.days === "custom") {
        isCustomRange = true;
      } else {
        isCustomRange = false;
      }
      loadChartData();
      loadApplianceDist();
      loadApplianceStatus();
    });
  });

  dateApplyBtn.addEventListener("click", function () {
    if (startDateInput.value && endDateInput.value) {
      loadChartData();
      loadApplianceDist();
      loadApplianceStatus();
    }
  });

  startDateInput.addEventListener("change", function () {
    if (endDateInput.value) {
      loadChartData();
      loadApplianceDist();
      loadApplianceStatus();
    }
  });

  endDateInput.addEventListener("change", function () {
    if (startDateInput.value) {
      loadChartData();
    }
  });

  buildingSelect.addEventListener("change", function () {
    isCustomRange = false;
    document.querySelectorAll(".dt-btn[data-days]").forEach(function (b) {
      b.classList.toggle("active", b.dataset.days === "7");
    });
    roomDataCache = {};
    document.getElementById("roomDetailPanel").classList.remove("visible");
    if (typeof clearThreeActive === "function") clearThreeActive();
    loadAppliances();
  });

  applianceSelect.addEventListener("change", function () {
    loadSummary();
  });

  document.querySelectorAll(".dt-btn[data-interval]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".dt-btn[data-interval]").forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      loadChartData();
    });
  });

  window.addEventListener("resize", function () {
    if (powerChart) powerChart.resize();
    if (chartLeft) chartLeft.resize();
    if (chartRight) chartRight.resize();
  });

  var ctrlBtns = document.querySelectorAll(".dt-ctrl-btn");
  var popups = document.querySelectorAll(".dt-popup");
  var activePopup = null;

  function closeAllPopups() {
    popups.forEach(function (p) { p.classList.remove("visible"); });
    ctrlBtns.forEach(function (b) { b.classList.remove("active"); });
    activePopup = null;
  }

  ctrlBtns.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      var popupId = "popup" + btn.id.replace("btn", "");
      var popup = document.getElementById(popupId);
      
      if (activePopup === popup) {
        closeAllPopups();
        return;
      }
      
      closeAllPopups();
      if (popup) {
        popup.classList.add("visible");
        btn.classList.add("active");
        activePopup = popup;
      }
    });
  });

  document.querySelectorAll(".dt-popup-close").forEach(function (btn) {
    btn.addEventListener("click", closeAllPopups);
  });

  document.addEventListener("click", function (e) {
    if (activePopup && !activePopup.contains(e.target)) {
      closeAllPopups();
    }
  });

  FloorplanData.init();

  var savedPlan = FloorplanStorage.load();
  if (savedPlan) {
    FloorplanData.importJSON(JSON.stringify(savedPlan));
  }

  if (typeof renderFloorPlan === "function") {
    renderFloorPlan();
  }

  function showToast(msg) {
    var existing = document.querySelector(".dt-toast")
    if (existing) existing.remove()
    var el = document.createElement("div")
    el.className = "dt-toast"
    el.textContent = msg
    document.body.appendChild(el)
    requestAnimationFrame(function () {
      el.classList.add("visible")
    })
    setTimeout(function () {
      el.classList.remove("visible")
      setTimeout(function () { el.remove() }, 300)
    }, 2000)
  }
  window.showToast = showToast

  document.getElementById("btnOpenEditor").addEventListener("click", function () {
    closeAllPopups()
    var editorEl = document.getElementById("floorplanEditor")
    if (!editorEl) return
    editorEl.classList.add("visible")
    FloorplanEditor.init(editorEl, function () {
      editorEl.classList.remove("visible")
    })
  })

  var presetSelect = document.getElementById("presetSelect")
  if (presetSelect) {
    presetSelect.addEventListener("change", function () {
      var val = this.value
      if (val === "default") {
        FloorplanData.resetToDefault()
      } else {
        FloorplanData.loadPreset(val)
      }
      FloorplanStorage.clear()
      showToast(typeof t === "function" ? t("saveLayout") + " ✓" : "Applied ✓")
    })
  }

  loadBuildings();
})();