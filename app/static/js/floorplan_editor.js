var FloorplanEditor = (function () {
  var container = null
  var canvas = null
  var ctx = null
  var visible = false
  var initialized = false
  var dpr = 1

  var GRID_MAJOR = 40
  var GRID_MINOR = 10
  var SNAP = 5
  var PADDING = 40
  var HANDLE_SIZE = 8
  var MIN_ROOM = 30

  var rooms = []
  var selectedId = null
  var hoveredId = null

  var dragMode = null
  var dragStart = null
  var dragRoomCopy = null
  var dragHandle = null
  var isDragging = false

  var canvasW = 0
  var canvasH = 0
  var viewOX = 0
  var viewOY = 0

  var onCloseCallback = null

  function init(el, closeFn) {
    container = el
    onCloseCallback = closeFn || null
    canvas = container.querySelector(".fe-canvas")
    if (!canvas) return

    if (initialized) {
      show()
      return
    }

    ctx = canvas.getContext("2d")
    dpr = Math.min(window.devicePixelRatio || 1, 2)

    refreshRooms()
    layoutCanvas()
    calcViewOffset()
    bindEvents()
    bindToolbar()
    render()

    FloorplanData.onChange(function (updated) {
      rooms = updated
      if (visible) { calcViewOffset(); render() }
    })

    initialized = true
    visible = true
  }

  function destroy() {
    visible = false
    selectedId = null
    hoveredId = null
    dragMode = null
    unbindEvents()
    updatePropertyPanel()
  }

  function refreshRooms() {
    rooms = FloorplanData.getRooms()
  }

  function layoutCanvas() {
    var rect = container.getBoundingClientRect()
    canvasW = rect.width - 8
    canvasH = rect.height - 8
    if (canvasW < 200) canvasW = 200
    if (canvasH < 150) canvasH = 150

    canvas.width = canvasW * dpr
    canvas.height = canvasH * dpr
    canvas.style.width = canvasW + "px"
    canvas.style.height = canvasH + "px"
  }

  function calcViewOffset() {
    if (!rooms || rooms.length === 0) { viewOX = 0; viewOY = 0; return }
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (var i = 0; i < rooms.length; i++) {
      var r = rooms[i]
      if (r.x < minX) minX = r.x
      if (r.y < minY) minY = r.y
      if (r.x + r.w > maxX) maxX = r.x + r.w
      if (r.y + r.h > maxY) maxY = r.y + r.h
    }
    var contentW = maxX - minX
    var contentH = maxY - minY
    var availW = canvasW - PADDING * 2
    var availH = canvasH - PADDING * 2
    viewOX = minX - Math.max((availW - contentW) / 2, 0) - PADDING
    viewOY = minY - Math.max((availH - contentH) / 2, 0) - PADDING
  }

  function snap(v) {
    return Math.round(v / SNAP) * SNAP
  }

  function clampRoom(r) {
    if (r.w < MIN_ROOM) r.w = MIN_ROOM
    if (r.h < MIN_ROOM) r.h = MIN_ROOM
    return r
  }

  function getMousePos(e) {
    var rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) / (rect.width / canvasW) + viewOX,
      y: (e.clientY - rect.top) / (rect.height / canvasH) + viewOY
    }
  }

  function findRoomAt(mx, my) {
    for (var i = rooms.length - 1; i >= 0; i--) {
      var r = rooms[i]
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) return r
    }
    return null
  }

  function getHandleAt(mx, my, room) {
    if (!room) return null
    var h = HANDLE_SIZE
    var hh = h / 2
    var corners = [
      { name: "nw", x: room.x - hh, y: room.y - hh },
      { name: "ne", x: room.x + room.w - hh, y: room.y - hh },
      { name: "sw", x: room.x - hh, y: room.y + room.h - hh },
      { name: "se", x: room.x + room.w - hh, y: room.y + room.h - hh }
    ]
    for (var i = 0; i < corners.length; i++) {
      var c = corners[i]
      if (mx >= c.x && mx <= c.x + h && my >= c.y && my <= c.y + h) return c.name
    }
    return null
  }

  function onMouseDown(e) {
    if (!visible) return
    var pos = getMousePos(e)
    var mx = pos.x, my = pos.y

    if (selectedId) {
      var selRoom = null
      for (var i = 0; i < rooms.length; i++) {
        if (rooms[i].id === selectedId) { selRoom = rooms[i]; break }
      }
      if (selRoom) {
        var handle = getHandleAt(mx, my, selRoom)
        if (handle) {
          dragMode = "resize"
          dragStart = { x: mx, y: my }
          dragRoomCopy = { x: selRoom.x, y: selRoom.y, w: selRoom.w, h: selRoom.h, id: selRoom.id, type: selRoom.type }
          dragHandle = handle
          return
        }
      }
    }

    var room = findRoomAt(mx, my)
    if (room) {
      selectRoom(room.id)
      dragMode = "move"
      dragStart = { x: mx, y: my }
      dragRoomCopy = { x: room.x, y: room.y, w: room.w, h: room.h, id: room.id, type: room.type }
      return
    }

    selectRoom(null)
    dragMode = null
  }

  function onMouseMove(e) {
    if (!visible) return
    var pos = getMousePos(e)
    var mx = pos.x, my = pos.y

    if (dragMode === "move" && dragRoomCopy) {
      isDragging = true
      var dx = mx - dragStart.x
      var dy = my - dragStart.y
      FloorplanData.updateRoom(dragRoomCopy.id, { x: snap(dragRoomCopy.x + dx), y: snap(dragRoomCopy.y + dy) })
      return
    }

    if (dragMode === "resize" && dragRoomCopy && dragHandle) {
      isDragging = true
      var dx2 = mx - dragStart.x
      var dy2 = my - dragStart.y
      var changes = {}
      if (dragHandle.indexOf("e") !== -1) {
        changes.w = snap(Math.max(MIN_ROOM, dragRoomCopy.w + dx2))
      }
      if (dragHandle.indexOf("w") !== -1) {
        var newW = snap(Math.max(MIN_ROOM, dragRoomCopy.w - dx2))
        changes.x = dragRoomCopy.x + dragRoomCopy.w - newW
        changes.w = newW
      }
      if (dragHandle.indexOf("s") !== -1) {
        changes.h = snap(Math.max(MIN_ROOM, dragRoomCopy.h + dy2))
      }
      if (dragHandle.indexOf("n") !== -1) {
        var newH = snap(Math.max(MIN_ROOM, dragRoomCopy.h - dy2))
        changes.y = dragRoomCopy.y + dragRoomCopy.h - newH
        changes.h = newH
      }
      FloorplanData.updateRoom(dragRoomCopy.id, changes)
      return
    }

    var room = findRoomAt(mx, my)
    if (room && room.id !== hoveredId) {
      hoveredId = room.id
      canvas.style.cursor = "pointer"
      render()
    } else if (!room && hoveredId) {
      hoveredId = null
      canvas.style.cursor = "default"
      render()
    }

    if (selectedId) {
      var sel = null
      for (var i2 = 0; i2 < rooms.length; i2++) {
        if (rooms[i2].id === selectedId) { sel = rooms[i2]; break }
      }
      if (sel) {
        var h = getHandleAt(mx, my, sel)
        var cursors = { nw: "nw-resize", ne: "ne-resize", sw: "sw-resize", se: "se-resize" }
        canvas.style.cursor = h ? (cursors[h] || "default") : "move"
      }
    }
  }

  function onMouseUp() {
    if (isDragging && dragRoomCopy) {
      var latest = null
      for (var i = 0; i < rooms.length; i++) {
        if (rooms[i].id === dragRoomCopy.id) { latest = rooms[i]; break }
      }
      if (latest) {
        clampRoom(latest)
        FloorplanData.updateRoom(latest.id, { x: latest.x, y: latest.y, w: latest.w, h: latest.h })
      }
    }
    dragMode = null
    dragStart = null
    dragRoomCopy = null
    dragHandle = null
    isDragging = false
  }

  function onKeyDown(e) {
    if (!visible) return
    if (e.key === "Delete" || e.key === "Backspace") {
      if (selectedId) {
        FloorplanData.removeRoom(selectedId)
        selectedId = null
        calcViewOffset()
        updatePropertyPanel()
        render()
      }
    }
    if (e.key === "Escape") close()
  }

  function selectRoom(id) {
    selectedId = id
    updatePropertyPanel()
    render()
    if (id && typeof setThreeActive === "function") {
      var room = null
      for (var i = 0; i < rooms.length; i++) {
        if (rooms[i].id === id) { room = rooms[i]; break }
      }
      if (room) {
        if (typeof clearThreeActive === "function") clearThreeActive()
        setThreeActive(room.type === "bedroom" ? "bedroom" : room.type)
      }
    }
  }

  function updatePropertyPanel() {
    var panel = container.querySelector(".fe-props-body")
    if (!panel) return
    if (!selectedId) {
      panel.innerHTML = '<div class="fe-props-empty">' + (typeof t === "function" ? t("noRoomSelected") : "Click a room to edit") + '</div>'
      return
    }
    var room = null
    for (var i = 0; i < rooms.length; i++) {
      if (rooms[i].id === selectedId) { room = rooms[i]; break }
    }
    if (!room) return

    var types = FloorplanData.getRoomTypes()
    var typeOpts = ""
    for (var j = 0; j < types.length; j++) {
      var tp = types[j]
      var sel = tp.type === room.type ? " selected" : ""
      var label = typeof t === "function" ? t(tp.labelKey) : tp.type
      typeOpts += '<option value="' + tp.type + '"' + sel + '>' + label + '</option>'
    }
    var tw = typeof t === "function" ? t : function (k) { return k }

    panel.innerHTML =
      '<div class="fe-prop-row">' +
        '<label class="fe-prop-label">' + tw("roomTypeLabel") + '</label>' +
        '<select class="fe-prop-select" data-prop="type">' + typeOpts + '</select>' +
      '</div>' +
      '<div class="fe-prop-row">' +
        '<label class="fe-prop-label">X</label>' +
        '<input class="fe-prop-input" type="number" data-prop="x" value="' + room.x + '" step="' + SNAP + '">' +
      '</div>' +
      '<div class="fe-prop-row">' +
        '<label class="fe-prop-label">Y</label>' +
        '<input class="fe-prop-input" type="number" data-prop="y" value="' + room.y + '" step="' + SNAP + '">' +
      '</div>' +
      '<div class="fe-prop-row">' +
        '<label class="fe-prop-label">' + tw("roomWidth") + '</label>' +
        '<input class="fe-prop-input" type="number" data-prop="w" value="' + room.w + '" step="' + SNAP + '" min="' + MIN_ROOM + '">' +
      '</div>' +
      '<div class="fe-prop-row">' +
        '<label class="fe-prop-label">' + tw("roomHeight") + '</label>' +
        '<input class="fe-prop-input" type="number" data-prop="h" value="' + room.h + '" step="' + SNAP + '" min="' + MIN_ROOM + '">' +
      '</div>'

    panel.querySelectorAll("select, input").forEach(function (el) {
      el.addEventListener("change", function () {
        var prop = el.dataset.prop
        if (prop === "type") {
          FloorplanData.updateRoom(selectedId, { type: el.value })
        } else {
          var changes = {}
          changes[prop] = parseInt(el.value) || MIN_ROOM
          FloorplanData.updateRoom(selectedId, changes)
        }
      })
    })
  }

  function render() {
    if (!ctx || !canvas) return
    ctx.save()
    ctx.setTransform(dpr, 0, 0, dpr, -viewOX, -viewOY)
    ctx.clearRect(viewOX, viewOY, canvasW, canvasH)

    drawGrid()
    drawRooms()

    if (selectedId) {
      var selRoom = null
      for (var i = 0; i < rooms.length; i++) {
        if (rooms[i].id === selectedId) { selRoom = rooms[i]; break }
      }
      if (selRoom) {
        drawSelection(selRoom)
        drawHandles(selRoom)
      }
    }

    ctx.restore()
  }

  function drawGrid() {
    var x0 = viewOX - (viewOX % GRID_MINOR + GRID_MINOR != 0 ? viewOX % GRID_MINOR : 0)
    var y0 = viewOY - (viewOY % GRID_MINOR + GRID_MINOR != 0 ? viewOY % GRID_MINOR : 0)
    x0 = Math.floor(viewOX / GRID_MINOR) * GRID_MINOR
    y0 = Math.floor(viewOY / GRID_MINOR) * GRID_MINOR

    ctx.strokeStyle = "rgba(56, 189, 248, 0.06)"
    ctx.lineWidth = 0.5
    for (var x = x0; x <= viewOX + canvasW; x += GRID_MINOR) {
      ctx.beginPath(); ctx.moveTo(x, viewOY); ctx.lineTo(x, viewOY + canvasH); ctx.stroke()
    }
    for (var y = y0; y <= viewOY + canvasH; y += GRID_MINOR) {
      ctx.beginPath(); ctx.moveTo(viewOX, y); ctx.lineTo(viewOX + canvasW, y); ctx.stroke()
    }

    x0 = Math.floor(viewOX / GRID_MAJOR) * GRID_MAJOR
    y0 = Math.floor(viewOY / GRID_MAJOR) * GRID_MAJOR
    ctx.strokeStyle = "rgba(56, 189, 248, 0.12)"
    ctx.lineWidth = 0.8
    for (var x2 = x0; x2 <= viewOX + canvasW; x2 += GRID_MAJOR) {
      ctx.beginPath(); ctx.moveTo(x2, viewOY); ctx.lineTo(x2, viewOY + canvasH); ctx.stroke()
    }
    for (var y2 = y0; y2 <= viewOY + canvasH; y2 += GRID_MAJOR) {
      ctx.beginPath(); ctx.moveTo(viewOX, y2); ctx.lineTo(viewOX + canvasW, y2); ctx.stroke()
    }
  }

  function drawRooms() {
    for (var i = 0; i < rooms.length; i++) {
      var r = rooms[i]
      var isSel = r.id === selectedId
      var isHov = r.id === hoveredId && !isSel
      var hex = FloorplanData.getColorHex(r.type)

      var alpha = isSel ? 0.55 : (isHov ? 0.40 : 0.22)
      ctx.fillStyle = hexToRgba(hex, alpha)
      ctx.strokeStyle = hexToRgba(hex, isSel ? 0.85 : (isHov ? 0.65 : 0.40))
      ctx.lineWidth = isSel ? 2 : 1

      var rx = r.x, ry = r.y, rw = r.w, rh = r.h
      var radius = 3

      ctx.beginPath()
      ctx.moveTo(rx + radius, ry)
      ctx.lineTo(rx + rw - radius, ry)
      ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius)
      ctx.lineTo(rx + rw, ry + rh - radius)
      ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh)
      ctx.lineTo(rx + radius, ry + rh)
      ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius)
      ctx.lineTo(rx, ry + radius)
      ctx.quadraticCurveTo(rx, ry, rx + radius, ry)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      if (isSel) {
        ctx.shadowColor = hex
        ctx.shadowBlur = 12
        ctx.stroke()
        ctx.shadowBlur = 0
      }

      ctx.fillStyle = "rgba(255,255,255," + (isSel ? "0.85" : "0.55") + ")"
      ctx.font = (rw > 50 && rh > 25 ? "11px" : "8px") + " 'Space Grotesk', 'Inter', sans-serif"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      var label = typeof t === "function" ? t(r.labelKey) : r.type
      if (rw > 30 && rh > 16) ctx.fillText(label, rx + rw / 2, ry + rh / 2)

      ctx.fillStyle = "rgba(255,255,255,0.18)"
      ctx.font = "7px 'Inter', sans-serif"
      var dims = r.w + "x" + r.h
      if (rw > 50 && rh > 30) ctx.fillText(dims, rx + rw / 2, ry + rh / 2 + 12)
    }
  }

  function drawSelection(room) {
    ctx.strokeStyle = "rgba(255,255,255,0.35)"
    ctx.lineWidth = 1.5
    ctx.setLineDash([4, 4])
    ctx.strokeRect(room.x - 3, room.y - 3, room.w + 6, room.h + 6)
    ctx.setLineDash([])
  }

  function drawHandles(room) {
    var handles = [
      { x: room.x, y: room.y },
      { x: room.x + room.w, y: room.y },
      { x: room.x, y: room.y + room.h },
      { x: room.x + room.w, y: room.y + room.h }
    ]
    var hh = HANDLE_SIZE / 2
    for (var i = 0; i < handles.length; i++) {
      var h = handles[i]
      ctx.fillStyle = "#38BDF8"
      ctx.strokeStyle = "rgba(255,255,255,0.9)"
      ctx.lineWidth = 1.5
      ctx.fillRect(h.x - hh, h.y - hh, HANDLE_SIZE, HANDLE_SIZE)
      ctx.strokeRect(h.x - hh, h.y - hh, HANDLE_SIZE, HANDLE_SIZE)
    }
  }

  function hexToRgba(hex, alpha) {
    var r = parseInt(hex.slice(1, 3), 16)
    var g = parseInt(hex.slice(3, 5), 16)
    var b = parseInt(hex.slice(5, 7), 16)
    return "rgba(" + r + "," + g + "," + b + "," + alpha + ")"
  }

  function bindEvents() {
    canvas.addEventListener("mousedown", onMouseDown)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    window.addEventListener("keydown", onKeyDown)
  }

  function unbindEvents() {
    canvas.removeEventListener("mousedown", onMouseDown)
    window.removeEventListener("mousemove", onMouseMove)
    window.removeEventListener("mouseup", onMouseUp)
    window.removeEventListener("keydown", onKeyDown)
  }

  function bindToolbar() {
    var addBtn = container.querySelector(".fe-btn-add")
    var delBtn = container.querySelector(".fe-btn-delete")
    var saveBtn = container.querySelector(".fe-btn-save")
    var resetBtn = container.querySelector(".fe-btn-reset")
    var closeBtn = container.querySelector(".fe-btn-close-editor")
    var typeList = container.querySelector(".fe-type-list")

    if (addBtn && typeList) {
      addBtn.addEventListener("click", function (e) {
        e.stopPropagation()
        typeList.style.display = typeList.style.display === "flex" ? "none" : "flex"
      })

      typeList.querySelectorAll(".fe-type-option").forEach(function (opt) {
        opt.addEventListener("click", function () {
          var type = opt.dataset.type
          var centerX = snap(viewOX + canvasW / 2 - 60)
          var centerY = snap(viewOY + canvasH / 2 - 40)
          var newRoom = FloorplanData.addRoom(type, centerX, centerY, 120, 80)
          calcViewOffset()
          selectRoom(newRoom.id)
          typeList.style.display = "none"
        })
      })

      document.addEventListener("click", function (e) {
        if (typeList.style.display === "flex" && !typeList.contains(e.target) && e.target !== addBtn) {
          typeList.style.display = "none"
        }
      })
    }

    if (delBtn) {
      delBtn.addEventListener("click", function () {
        if (selectedId) {
          FloorplanData.removeRoom(selectedId)
          selectedId = null
          calcViewOffset()
          updatePropertyPanel()
          render()
        }
      })
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", function () {
        var ok = FloorplanStorage.save(FloorplanData.getRooms())
        if (typeof showToast === "function") {
          showToast(ok ? (typeof t === "function" ? t("saveLayout") + " ✓" : "Saved ✓") : "Save failed")
        }
      })
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        FloorplanData.resetToDefault()
        selectedId = null
        updatePropertyPanel()
        FloorplanStorage.clear()
        calcViewOffset()
        render()
      })
    }

    if (closeBtn) {
      closeBtn.addEventListener("click", close)
    }
  }

  function close() {
    destroy()
    container.classList.remove("visible")
    if (onCloseCallback) onCloseCallback()
  }

  function show() {
    visible = true
    refreshRooms()
    layoutCanvas()
    calcViewOffset()
    bindEvents()
    render()
    updatePropertyPanel()
  }

  return {
    init: init,
    show: show,
    close: close,
    visible: function () { return visible }
  }
})()
