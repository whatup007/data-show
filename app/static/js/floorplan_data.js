var FloorplanData = (function () {
  var listeners = []
  var rooms = []
  var idCounter = 0
  var activePreset = "default"

  var typeColorHex = {
    lounge: "#818CF8", kitchen: "#22D3EE", utility: "#A78BFA",
    hall: "#38BDF8", bathroom: "#2DD4BF", study: "#6366F1",
    bedroom: "#A78BFA", dining: "#F59E0B", garage: "#6B7280",
    custom: "#38BDF8"
  }

  var typeColor3D = {
    lounge: 0x818CF8, kitchen: 0x22D3EE, utility: 0xA78BFA,
    hall: 0x38BDF8, bathroom: 0x2DD4BF, study: 0x6366F1,
    bedroom: 0xA78BFA, dining: 0xF59E0B, garage: 0x6B7280,
    custom: 0x38BDF8
  }

  var defaultPlan = [
    { id: "room-lounge",   type: "lounge",   x: 15,  y: 20,  w: 220, h: 180, inst: null, labelKey: "roomLounge" },
    { id: "room-kitchen",  type: "kitchen",  x: 240, y: 20,  w: 170, h: 180, inst: null, labelKey: "roomKitchen" },
    { id: "room-utility",  type: "utility",  x: 415, y: 20,  w: 150, h: 110, inst: null, labelKey: "roomUtility" },
    { id: "room-hall",     type: "hall",     x: 15,  y: 205, w: 160, h: 90,  inst: null, labelKey: "roomHall" },
    { id: "room-bathroom", type: "bathroom", x: 180, y: 205, w: 130, h: 90,  inst: null, labelKey: "roomBathroom" },
    { id: "room-study",    type: "study",    x: 315, y: 205, w: 130, h: 90,  inst: null, labelKey: "roomStudy" },
    { id: "room-bedroom1", type: "bedroom",  x: 15,  y: 300, w: 210, h: 80,  inst: "1", labelKey: "roomBedroom1" },
    { id: "room-bedroom2", type: "bedroom",  x: 230, y: 300, w: 210, h: 80,  inst: "2", labelKey: "roomBedroom2" }
  ]

  var presets = {
    "小户型公寓": [
      { id: "rp1-lounge",   type: "lounge",   x: 10,  y: 10,  w: 180, h: 160, inst: null, labelKey: "roomLounge" },
      { id: "rp1-kitchen",  type: "kitchen",  x: 200, y: 10,  w: 130, h: 160, inst: null, labelKey: "roomKitchen" },
      { id: "rp1-bathroom", type: "bathroom", x: 10,  y: 180, w: 120, h: 90,  inst: null, labelKey: "roomBathroom" },
      { id: "rp1-bedroom",  type: "bedroom",  x: 140, y: 180, w: 190, h: 130, inst: "1", labelKey: "roomBedroom1" }
    ],
    "标准三居室": [
      { id: "rp2-lounge",   type: "lounge",   x: 10,  y: 10,  w: 250, h: 200, inst: null, labelKey: "roomLounge" },
      { id: "rp2-kitchen",  type: "kitchen",  x: 270, y: 10,  w: 150, h: 200, inst: null, labelKey: "roomKitchen" },
      { id: "rp2-dining",   type: "dining",   x: 430, y: 10,  w: 140, h: 140, inst: null, labelKey: "roomDining" },
      { id: "rp2-hall",     type: "hall",     x: 10,  y: 220, w: 180, h: 85,  inst: null, labelKey: "roomHall" },
      { id: "rp2-bathroom", type: "bathroom", x: 200, y: 220, w: 110, h: 85,  inst: null, labelKey: "roomBathroom" },
      { id: "rp2-bedroom1", type: "bedroom",  x: 10,  y: 315, w: 200, h: 100, inst: "1", labelKey: "roomBedroom1" },
      { id: "rp2-bedroom2", type: "bedroom",  x: 220, y: 315, w: 180, h: 100, inst: "2", labelKey: "roomBedroom2" },
      { id: "rp2-study",    type: "study",    x: 430, y: 160, w: 140, h: 100, inst: null, labelKey: "roomStudy" }
    ],
    "大平层": [
      { id: "rp3-lounge",   type: "lounge",   x: 10,  y: 10,  w: 270, h: 200, inst: null, labelKey: "roomLounge" },
      { id: "rp3-dining",   type: "dining",   x: 290, y: 10,  w: 200, h: 100, inst: null, labelKey: "roomDining" },
      { id: "rp3-kitchen",  type: "kitchen",  x: 290, y: 120, w: 200, h: 190, inst: null, labelKey: "roomKitchen" },
      { id: "rp3-hall",     type: "hall",     x: 10,  y: 220, w: 270, h: 80,  inst: null, labelKey: "roomHall" },
      { id: "rp3-bedroom1", type: "bedroom",  x: 10,  y: 310, w: 270, h: 120, inst: "1", labelKey: "roomBedroom1" },
      { id: "rp3-bathroom", type: "bathroom", x: 290, y: 320, w: 200, h: 90,  inst: null, labelKey: "roomBathroom" },
      { id: "rp3-study",    type: "study",    x: 10,  y: 440, w: 270, h: 100, inst: null, labelKey: "roomStudy" },
      { id: "rp3-bedroom2", type: "bedroom",  x: 290, y: 420, w: 200, h: 120, inst: "2", labelKey: "roomBedroom2" }
    ],
    "联排别墅": [
      { id: "rp4-garage",   type: "garage",   x: 10,  y: 10,  w: 230, h: 130, inst: null, labelKey: "roomGarage" },
      { id: "rp4-hall",     type: "hall",     x: 10,  y: 150, w: 230, h: 80,  inst: null, labelKey: "roomHall" },
      { id: "rp4-bathroom", type: "bathroom", x: 10,  y: 240, w: 230, h: 90,  inst: null, labelKey: "roomBathroom" },
      { id: "rp4-utility",  type: "utility",  x: 10,  y: 340, w: 230, h: 80,  inst: null, labelKey: "roomUtility" },
      { id: "rp4-bedroom1", type: "bedroom",  x: 10,  y: 430, w: 230, h: 120, inst: "1", labelKey: "roomBedroom1" },
      { id: "rp4-lounge",   type: "lounge",   x: 250, y: 10,  w: 240, h: 210, inst: null, labelKey: "roomLounge" },
      { id: "rp4-kitchen",  type: "kitchen",  x: 250, y: 230, w: 240, h: 140, inst: null, labelKey: "roomKitchen" },
      { id: "rp4-dining",   type: "dining",   x: 250, y: 380, w: 240, h: 130, inst: null, labelKey: "roomDining" },
      { id: "rp4-bedroom2", type: "bedroom",  x: 250, y: 520, w: 240, h: 120, inst: "2", labelKey: "roomBedroom2" }
    ],
    "开放式工作室": [
      { id: "rp5-custom",   type: "lounge",   x: 10,  y: 10,  w: 280, h: 260, inst: null, labelKey: "roomLounge" },
      { id: "rp5-kitchen",  type: "kitchen",  x: 300, y: 10,  w: 140, h: 120, inst: null, labelKey: "roomKitchen" },
      { id: "rp5-bathroom", type: "bathroom", x: 300, y: 140, w: 140, h: 100, inst: null, labelKey: "roomBathroom" },
      { id: "rp5-study",    type: "study",    x: 10,  y: 280, w: 200, h: 140, inst: null, labelKey: "roomStudy" },
      { id: "rp5-bedroom",  type: "bedroom",  x: 220, y: 280, w: 220, h: 140, inst: "1", labelKey: "roomBedroom1" }
    ]
  }

  var roomTypeOptions = [
    { type: "lounge",   labelKey: "roomLounge" },
    { type: "kitchen",  labelKey: "roomKitchen" },
    { type: "bedroom",  labelKey: "roomBedroom1" },
    { type: "bathroom", labelKey: "roomBathroom" },
    { type: "study",    labelKey: "roomStudy" },
    { type: "hall",     labelKey: "roomHall" },
    { type: "utility",  labelKey: "roomUtility" },
    { type: "dining",   labelKey: "roomDining" },
    { type: "garage",   labelKey: "roomGarage" },
    { type: "custom",   labelKey: "roomCustom" }
  ]

  function clonePlan(source) {
    return JSON.parse(JSON.stringify(source))
  }

  function init(presetName) {
    if (presetName && presets[presetName]) {
      rooms = clonePlan(presets[presetName])
      activePreset = presetName
    } else {
      rooms = clonePlan(defaultPlan)
      activePreset = "default"
    }
    idCounter = rooms.length
  }

  function getPresetNames() {
    return Object.keys(presets)
  }

  function getActivePreset() {
    return activePreset
  }

  function getRooms() {
    return rooms
  }

  function getColorHex(type) {
    return typeColorHex[type] || typeColorHex.custom
  }

  function getColor3D(type) {
    return typeColor3D[type] || typeColor3D.custom
  }

  function getRoomTypes() {
    return roomTypeOptions
  }

  function generateLabelKey(type, inst) {
    if (type === "bedroom" && inst) return "roomBedroom" + inst
    return "room" + type.charAt(0).toUpperCase() + type.slice(1)
  }

  function addRoom(type, x, y, w, h) {
    idCounter++
    var inst = null
    if (type === "bedroom") inst = String(idCounter)
    var room = {
      id: "room-" + idCounter,
      type: type, x: x, y: y, w: w, h: h,
      inst: inst,
      labelKey: generateLabelKey(type, inst)
    }
    rooms.push(room)
    notify()
    return room
  }

  function updateRoom(id, changes) {
    for (var i = 0; i < rooms.length; i++) {
      if (rooms[i].id === id) {
        for (var key in changes) {
          if (changes.hasOwnProperty(key)) rooms[i][key] = changes[key]
        }
        if (changes.type && rooms[i].type === "bedroom" && !rooms[i].inst) {
          idCounter++
          rooms[i].inst = String(idCounter)
        }
        if (changes.type && rooms[i].type !== "bedroom") {
          rooms[i].inst = null
        }
        rooms[i].labelKey = generateLabelKey(rooms[i].type, rooms[i].inst)
        notify()
        return
      }
    }
  }

  function removeRoom(id) {
    rooms = rooms.filter(function (r) { return r.id !== id })
    notify()
  }

  function resetToDefault() {
    rooms = clonePlan(defaultPlan)
    activePreset = "default"
    idCounter = rooms.length
    notify()
  }

  function loadPreset(name) {
    if (!presets[name]) return false
    rooms = clonePlan(presets[name])
    activePreset = name
    idCounter = rooms.length
    notify()
    return true
  }

  function exportJSON() {
    return JSON.stringify(rooms, null, 2)
  }

  function importJSON(json) {
    try {
      var data = JSON.parse(json)
      if (Array.isArray(data) && data.length > 0) {
        rooms = data
        idCounter = rooms.length
        activePreset = "custom"
        notify()
        return true
      }
    } catch (e) { return false }
    return false
  }

  function onChange(fn) {
    listeners.push(fn)
  }

  function notify() {
    var snapshot = clonePlan(rooms)
    for (var i = 0; i < listeners.length; i++) {
      listeners[i](snapshot)
    }
  }

  return {
    init: init,
    getPresetNames: getPresetNames,
    getActivePreset: getActivePreset,
    loadPreset: loadPreset,
    getRooms: getRooms,
    getColorHex: getColorHex,
    getColor3D: getColor3D,
    getRoomTypes: getRoomTypes,
    addRoom: addRoom,
    updateRoom: updateRoom,
    removeRoom: removeRoom,
    resetToDefault: resetToDefault,
    exportJSON: exportJSON,
    importJSON: importJSON,
    onChange: onChange
  }
})()
