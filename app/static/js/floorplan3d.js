/* Floor Plan 3D - Three.js  (Dynamic Data) */
var threePlan = null

function getEnglishRoomName(type, inst) {
  var map = {
    lounge: "Lounge", kitchen: "Kitchen", utility: "Utility",
    hall: "Hall", bathroom: "Bathroom", study: "Study",
    bedroom: "Bedroom", dining: "Dining Room", garage: "Garage",
    custom: "Custom"
  }
  var name = map[type] || type
  if (inst) return name + " " + inst
  return name
}

function clearThreeActive() {
  if (threePlan && threePlan.resetActive) threePlan.resetActive()
}

function setThreeActive(roomName) {
  if (!threePlan || !threePlan.roomMeshes) return
  for (var i = 0; i < threePlan.roomMeshes.length; i++) {
    var m = threePlan.roomMeshes[i]
    if (m.userData.room === roomName) {
      m.material.opacity = 0.50
      m.material.emissiveIntensity = 0.40
      threePlan.currentActive = m
      return
    }
  }
}

function refreshThreeLabels() {
  if (!threePlan || !threePlan.roomLabels) return
  for (var i = 0; i < threePlan.roomLabels.length; i++) {
    var label = threePlan.roomLabels[i]
    var div = label.element
    if (div && div.dataset.roomKey) {
      div.textContent = t(div.dataset.roomKey)
    }
  }
}

function rebuildThreeRooms() {
  if (!threePlan) return
  var scene = threePlan.scene
  var planGroup = threePlan.planGroup
  var roomGroup = threePlan.roomGroup

  if (roomGroup) {
    planGroup.remove(roomGroup)
    disposeGroup(roomGroup)
  }

  var roomsData = FloorplanData.getRooms()
  var center = computeCenter(roomsData)
  var cx = center.cx
  var cz = center.cz

  threePlan.cx = cx
  threePlan.cz = cz

  var newRoomGroup = new THREE.Group()
  planGroup.add(newRoomGroup)

  var result = buildRooms(roomsData, newRoomGroup, cx, cz)

  threePlan.roomGroup = newRoomGroup
  threePlan.roomMeshes = result.meshes
  threePlan.roomLabels = result.labels
  threePlan.energyParticles = result.energyParticles
  threePlan.rippleRings = result.rippleRings
  threePlan.resetActive()

  var modelSize = computeModelSize(roomsData)
  fitCamera(threePlan.camera, modelSize)

  refreshThreeLabels()
}

function buildRooms(roomsData, parent, cx, cz) {
  var meshes = []
  var labels = []
  var energyObjs = []
  var rings = []

  for (var idx = 0; idx < roomsData.length; idx++) {
    var rd = roomsData[idx]
    var rw = rd.w
    var rdepth = rd.h
    var rh = 16
    var px = rd.x + rw / 2 - cx
    var pz = -(rd.y + rdepth / 2 - Math.abs(cz))
    var color3d = FloorplanData.getColor3D(rd.type)

    var geom = new THREE.BoxGeometry(rw, rh, rdepth)
    var mat = new THREE.MeshPhongMaterial({
      color: color3d,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide,
      emissive: color3d,
      emissiveIntensity: 0.06,
      shininess: 60,
      specular: color3d,
      specularIntensity: 0.15,
    })
    var mesh = new THREE.Mesh(geom, mat)
    mesh.position.set(px, rh / 2, pz)
    mesh.userData = { room: rd.type === "bedroom" ? "bedroom" : rd.type, inst: rd.inst || null, idx: idx, id: rd.id, labelKey: rd.labelKey }
    parent.add(mesh)
    meshes.push(mesh)

    var sideMat = new THREE.MeshPhongMaterial({
      color: color3d,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      emissive: color3d,
      emissiveIntensity: 0.02,
    })
    var sideGeom = new THREE.BoxGeometry(rw, rh * 0.3, 2)
    var sideFront = new THREE.Mesh(sideGeom, sideMat)
    sideFront.position.set(px, rh * 0.15, pz + rdepth / 2 + 1)
    parent.add(sideFront)
    var sideBack = new THREE.Mesh(sideGeom, sideMat)
    sideBack.position.set(px, rh * 0.15, pz - rdepth / 2 - 1)
    parent.add(sideBack)

    var glowGeom = new THREE.BoxGeometry(rw + 4, rh + 4, rdepth + 4)
    var glowMat = new THREE.MeshBasicMaterial({
      color: color3d,
      transparent: true,
      opacity: 0.015,
      wireframe: true,
    })
    var glowMesh = new THREE.Mesh(glowGeom, glowMat)
    glowMesh.position.copy(mesh.position)
    parent.add(glowMesh)

    var shadowGeom = new THREE.PlaneGeometry(rw + 8, rdepth + 8)
    var shadowMat = new THREE.MeshBasicMaterial({
      color: color3d,
      transparent: true,
      opacity: 0.025,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    var shadow = new THREE.Mesh(shadowGeom, shadowMat)
    shadow.rotation.x = -Math.PI / 2
    shadow.position.set(px, -1, pz)
    parent.add(shadow)

    var eGeom = new THREE.EdgesGeometry(geom)
    var eMat = new THREE.LineBasicMaterial({
      color: color3d,
      transparent: true,
      opacity: 0.35,
      linewidth: 1,
    })
    var edges = new THREE.LineSegments(eGeom, eMat)
    edges.position.copy(mesh.position)
    parent.add(edges)

    var div = document.createElement("div")
    div.className = "floorplan-label-3d"
    div.textContent = typeof t === "function" ? t(rd.labelKey) : rd.type
    div.style.cssText = "color:rgba(255,255,255,0.6);font-size:12px;font-weight:500;font-family:'Space Grotesk',sans-serif;text-shadow:0 2px 16px rgba(0,0,0,0.95),0 0 6px rgba(0,0,0,0.7);pointer-events:none;user-select:none;text-align:center;letter-spacing:0.5px;"
    div.dataset.roomKey = rd.labelKey
    var label = new THREE.CSS2DObject(div)
    label.position.set(px, rh + 6, pz)
    parent.add(label)
    labels.push(label)

    var enDiv = document.createElement("div")
    enDiv.textContent = getEnglishRoomName(rd.type, rd.inst || null)
    enDiv.style.cssText = "color:rgba(255,255,255,0.2);font-size:8px;font-weight:400;font-family:'Inter',sans-serif;text-shadow:0 2px 12px rgba(0,0,0,0.9);pointer-events:none;user-select:none;text-align:center;letter-spacing:0.3px;"
    var enLabel = new THREE.CSS2DObject(enDiv)
    enLabel.position.set(px, rh - 12, pz)
    parent.add(enLabel)
  }

  var connections = generateConnections(roomsData, cx, cz)
  for (var c = 0; c < connections.length; c++) {
    var pair = connections[c]
    var ra = roomsData[pair[0]]
    var rb = roomsData[pair[1]]
    var ax = ra.x + ra.w / 2 - cx
    var az = -(ra.y + ra.h / 2 - Math.abs(cz))
    var bx = rb.x + rb.w / 2 - cx
    var bz = -(rb.y + rb.h / 2 - Math.abs(cz))
    var midX = (ax + bx) / 2
    var midZ = (az + bz) / 2
    var points = [
      new THREE.Vector3(ax, 0.5, az),
      new THREE.Vector3(midX, 1.5, midZ),
      new THREE.Vector3(bx, 0.5, bz)
    ]
    var curve = new THREE.CatmullRomCurve3(points)
    var lineGeom = new THREE.BufferGeometry().setFromPoints(curve.getPoints(16))
    var lineMat = new THREE.LineBasicMaterial({
      color: 0x818CF8,
      transparent: true,
      opacity: 0.06,
    })
    var line = new THREE.Line(lineGeom, lineMat)
    parent.add(line)

    var dotGeom = new THREE.SphereGeometry(1, 6, 6)
    var dotMat = new THREE.MeshBasicMaterial({
      color: 0x38BDF8,
      transparent: true,
      opacity: 0.3,
    })
    var dot = new THREE.Mesh(dotGeom, dotMat)
    dot.userData = { curve: curve, t: Math.random() }
    parent.add(dot)
    energyObjs.push(dot)
  }

  for (var r = 0; r < roomsData.length; r++) {
    var rd2 = roomsData[r]
    var color3d2 = FloorplanData.getColor3D(rd2.type)
    var ringGeom = new THREE.RingGeometry(2, 8, 48)
    var ringMat = new THREE.MeshBasicMaterial({
      color: color3d2,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    var ring = new THREE.Mesh(ringGeom, ringMat)
    var rpx = rd2.x + rd2.w / 2 - cx
    var rpz = -(rd2.y + rd2.h / 2 - Math.abs(cz))
    ring.position.set(rpx, 0.5, rpz)
    ring.rotation.x = -Math.PI / 2
    ring.userData = { phase: Math.random() * 5, color: color3d2 }
    parent.add(ring)
    rings.push(ring)
  }

  return {
    meshes: meshes,
    labels: labels,
    energyParticles: energyObjs,
    rippleRings: rings
  }
}

function generateConnections(roomsData, cx, cz) {
  var pairs = []
  if (roomsData.length < 2) return pairs
  for (var i = 0; i < roomsData.length; i++) {
    var a = roomsData[i]
    var bestDist = Infinity
    var bestIdx = -1
    for (var j = 0; j < roomsData.length; j++) {
      if (i === j) continue
      var b = roomsData[j]
      var already = false
      for (var k = 0; k < pairs.length; k++) {
        if ((pairs[k][0] === i && pairs[k][1] === j) || (pairs[k][0] === j && pairs[k][1] === i)) {
          already = true
          break
        }
      }
      if (already) continue
      var cax = a.x + a.w / 2
      var cay = a.y + a.h / 2
      var cbx = b.x + b.w / 2
      var cby = b.y + b.h / 2
      var dist = Math.sqrt((cax - cbx) * (cax - cbx) + (cay - cby) * (cay - cby))
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = j
      }
    }
    if (bestIdx >= 0) {
      var dup = false
      for (var d = 0; d < pairs.length; d++) {
        if ((pairs[d][0] === i && pairs[d][1] === bestIdx) || (pairs[d][0] === bestIdx && pairs[d][1] === i)) {
          dup = true
          break
        }
      }
      if (!dup) pairs.push([i, bestIdx])
    }
  }
  return pairs
}

function disposeGroup(group) {
  while (group.children.length > 0) {
    var child = group.children[0]
    if (child.geometry) child.geometry.dispose()
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(function (m) { m.dispose() })
      } else {
        child.material.dispose()
      }
    }
    group.remove(child)
  }
}

function computeCenter(roomsData) {
  if (!roomsData || roomsData.length === 0) return { cx: 290, cz: -210 }
  var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (var i = 0; i < roomsData.length; i++) {
    var r = roomsData[i]
    if (r.x < minX) minX = r.x
    if (r.x + r.w > maxX) maxX = r.x + r.w
    if (r.y < minY) minY = r.y
    if (r.y + r.h > maxY) maxY = r.y + r.h
  }
  return {
    cx: (minX + maxX) / 2,
    cz: -((minY + maxY) / 2)
  }
}

function computeModelSize(roomsData) {
  if (!roomsData || roomsData.length === 0) return 560
  var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (var i = 0; i < roomsData.length; i++) {
    var r = roomsData[i]
    if (r.x < minX) minX = r.x
    if (r.x + r.w > maxX) maxX = r.x + r.w
    if (r.y < minY) minY = r.y
    if (r.y + r.h > maxY) maxY = r.y + r.h
  }
  var w = maxX - minX
  var d = maxY - minY
  return Math.max(w, d)
}

function fitCamera(camera, modelSize, aspect) {
   var minDist = 500
   var dist = Math.max(minDist, modelSize * 2.0)
  var dir = { x: 0.534, y: 0.597, z: 0.597 }
  camera.position.set(dir.x * dist, dir.y * dist, dir.z * dist)
  camera.lookAt(0, 0, 0)
  camera.aspect = aspect || camera.aspect
  camera.updateProjectionMatrix()
}

function initThreeFloorPlan() {
  if (threePlan) return
  var container = document.getElementById("floorplanContainer")
  if (!container || container.querySelector("canvas")) return
  var loading = document.getElementById("floorplanLoading")
  if (loading) loading.style.display = "none"
  var w = container.clientWidth || 640
  var h = container.clientHeight || 480
  if (w < 100 || h < 100) { w = 640; h = 480 }

  var roomsData = FloorplanData.getRooms()
  var center = computeCenter(roomsData)
  var cx = center.cx
  var cz = center.cz

  var scene = new THREE.Scene()
  var camera = new THREE.PerspectiveCamera(34, w / h, 1, 3000)
  var modelSize = computeModelSize(roomsData)
  fitCamera(camera, modelSize, w / h)

  var renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  })
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  renderer.domElement.style.display = "block"
  renderer.domElement.style.width = "100%"
  renderer.domElement.style.height = "100%"
  container.insertBefore(renderer.domElement, container.firstChild)

  var labelRenderer = new THREE.CSS2DRenderer()
  labelRenderer.setSize(w, h)
  labelRenderer.domElement.style.position = "absolute"
  labelRenderer.domElement.style.top = "0"
  labelRenderer.domElement.style.left = "0"
  labelRenderer.domElement.style.pointerEvents = "none"
  var panel = container.querySelector(".room-detail-panel")
  if (panel) { container.insertBefore(labelRenderer.domElement, panel) }
  else { container.appendChild(labelRenderer.domElement) }

  var ambient = new THREE.AmbientLight(0x404080, 0.4)
  scene.add(ambient)
  var dirLight = new THREE.DirectionalLight(0x8888ff, 0.45)
  dirLight.position.set(300, 600, 400)
  scene.add(dirLight)
  var fillLight = new THREE.DirectionalLight(0x8188f8, 0.2)
  fillLight.position.set(-200, 100, -300)
  scene.add(fillLight)
  var rimLight = new THREE.DirectionalLight(0x818CF8, 0.25)
  rimLight.position.set(0, -300, 500)
  scene.add(rimLight)
  var topGlow = new THREE.PointLight(0x38BDF8, 0.15, 800)
  topGlow.position.set(0, 400, 0)
  scene.add(topGlow)

  var planGroup = new THREE.Group()
  scene.add(planGroup)

  var roomGroup = new THREE.Group()
  planGroup.add(roomGroup)

  var result = buildRooms(roomsData, roomGroup, cx, cz)
  var roomMeshes = result.meshes
  var roomLabels = result.labels
  var energyParticles = result.energyParticles
  var rippleRings = result.rippleRings

  var groundSizeW = 560
  var groundSizeH = 390
  if (roomsData.length > 0) {
    var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (var i = 0; i < roomsData.length; i++) {
      var r = roomsData[i]
      if (r.x < minX) minX = r.x
      if (r.x + r.w > maxX) maxX = r.x + r.w
      if (r.y < minY) minY = r.y
      if (r.y + r.h > maxY) maxY = r.y + r.h
    }
    groundSizeW = Math.max(560, maxX - minX + 60)
    groundSizeH = Math.max(390, maxY - minY + 60)
  }

  var gGeom = new THREE.PlaneGeometry(groundSizeW, groundSizeH)
  var gMat = new THREE.MeshBasicMaterial({
    color: 0x818CF8,
    transparent: true,
    opacity: 0.02,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  var ground = new THREE.Mesh(gGeom, gMat)
  ground.rotation.x = -Math.PI / 2
  ground.position.set(0, -0.5, 0)
  planGroup.add(ground)

  var gridDivs = Math.max(20, Math.round(Math.max(groundSizeW, groundSizeH) / 28))
  var gridHelper = new THREE.GridHelper(Math.max(groundSizeW, groundSizeH), gridDivs, 0x818CF8, 0x22D3EE)
  gridHelper.position.y = -0.3
  gridHelper.material.transparent = true
  gridHelper.material.opacity = 0.04
  planGroup.add(gridHelper)

  var bGeom = new THREE.EdgesGeometry(new THREE.BoxGeometry(groundSizeW - 4, 0.5, groundSizeH - 4))
  var bMat = new THREE.LineBasicMaterial({
    color: 0x818CF8,
    transparent: true,
    opacity: 0.05,
  })
  var bound = new THREE.LineSegments(bGeom, bMat)
  bound.position.set(0, 0.5, 0)
  planGroup.add(bound)

  var isHovering = false
  var hoveredMesh = null
  var activeMesh = null

  function animate() {
    requestAnimationFrame(animate)
    var t = Date.now() * 0.001

    var floatOffset = Math.sin(t * 0.2) * 2
    planGroup.position.y = floatOffset

    if (!isHovering) planGroup.rotation.y += 0.0015

    var particles = threePlan ? threePlan.energyParticles : energyParticles
    if (particles) {
      for (var p = 0; p < particles.length; p++) {
        var obj = particles[p]
        if (obj.userData && obj.userData.curve) {
          obj.userData.t = (obj.userData.t + 0.08 * 0.016) % 1
          var pt = obj.userData.curve.getPoint(obj.userData.t)
          obj.position.copy(pt)
          obj.material.opacity = 0.15 + Math.sin(t * 2 + obj.userData.t * 10) * 0.1
        }
      }
    }

    var rings = threePlan ? threePlan.rippleRings : rippleRings
    if (rings) {
      for (var ri = 0; ri < rings.length; ri++) {
        var ring = rings[ri]
        var phase = ring.userData.phase || 0
        var pulse = (Math.sin(t * 1.2 + phase) + 1) * 0.5
        var s = 0.4 + pulse * 1.6
        ring.scale.set(s, s, s)
        ring.material.opacity = 0.08 + pulse * 0.3
        ring.material.color.setHex(ring.userData.color || 0x818CF8)
      }
    }

    renderer.render(scene, camera)
    labelRenderer.render(scene, camera)
  }
  animate()

  var raycaster = new THREE.Raycaster()
  var mouse = new THREE.Vector2()

  function getIntersects(e) {
    var r = renderer.domElement.getBoundingClientRect()
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1
    mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1
    raycaster.setFromCamera(mouse, camera)
    var currentMeshes = (threePlan && threePlan.roomMeshes) ? threePlan.roomMeshes : roomMeshes
    return raycaster.intersectObjects(currentMeshes)
  }

  renderer.domElement.addEventListener("mousemove", function (e) {
    var hits = getIntersects(e)
    if (hits.length > 0) {
      isHovering = true
      var hit = hits[0].object
      if (hoveredMesh !== hit) {
        if (hoveredMesh && hoveredMesh !== activeMesh) {
          hoveredMesh.material.opacity = 0.18
          hoveredMesh.material.emissiveIntensity = 0.08
        }
        hoveredMesh = hit
        if (hit !== activeMesh) {
          hit.material.opacity = 0.40
          hit.material.emissiveIntensity = 0.25
        }
        renderer.domElement.style.cursor = "pointer"
        var panelEl = document.getElementById("roomDetailPanel")
        var titleEl = document.getElementById("roomDetailTitle")
        if (panelEl && titleEl) {
          titleEl.textContent = typeof t === "function" ? t(hit.userData.labelKey) : hit.userData.labelKey
          var ct = document.getElementById("roomDetailContent")
          if (ct && !ct.querySelector(".room-appliance-item")) ct.innerHTML = '<div class="dt-room-empty">' + (typeof t === "function" ? t("clickRoomTip") : "Click") + '</div>'
          panelEl.classList.add("visible")
        }
      }
    } else {
      isHovering = false
      if (hoveredMesh && hoveredMesh !== activeMesh) {
        hoveredMesh.material.opacity = 0.18
        hoveredMesh.material.emissiveIntensity = 0.08
      }
      hoveredMesh = null
      renderer.domElement.style.cursor = "default"
      if (!activeMesh) {
        var panelEl2 = document.getElementById("roomDetailPanel")
        if (panelEl2 && !panelEl2.querySelector(".room-appliance-item")) panelEl2.classList.remove("visible")
      }
    }
  })

  renderer.domElement.addEventListener("click", function (e) {
    var hits = getIntersects(e)
    if (hits.length > 0) {
      var hit = hits[0].object
      var room = hit.userData.room
      var inst = hit.userData.inst
      var roomKey = inst ? room + "_" + inst : room
      var roomName = inst ? "bedroom" : room

      if (activeMesh === hit) {
        activeMesh.material.opacity = 0.18
        activeMesh.material.emissiveIntensity = 0.08
        activeMesh = null
        document.getElementById("roomDetailPanel").classList.remove("visible")
        renderer.domElement.style.cursor = "default"
        return
      }

      if (activeMesh) {
        activeMesh.material.opacity = 0.18
        activeMesh.material.emissiveIntensity = 0.08
      }
      activeMesh = hit
      hit.material.opacity = 0.55
      hit.material.emissiveIntensity = 0.40
      if (typeof loadRoomData === "function") {
        loadRoomData(roomKey, roomName, e.clientX, e.clientY)
      }
    } else {
      if (activeMesh) {
        activeMesh.material.opacity = 0.18
        activeMesh.material.emissiveIntensity = 0.08
        activeMesh = null
      }
      document.getElementById("roomDetailPanel").classList.remove("visible")
      renderer.domElement.style.cursor = "default"
    }
  })

  renderer.domElement.addEventListener("touchstart", function (e) {
    var t = e.touches[0]
    renderer.domElement.dispatchEvent(new MouseEvent("click", { clientX: t.clientX, clientY: t.clientY }))
  }, { passive: true })

  if (window.ResizeObserver) {
    new ResizeObserver(function () {
      var cw = container.clientWidth
      var ch = container.clientHeight
      if (cw > 0 && ch > 0) {
        camera.aspect = cw / ch
        camera.updateProjectionMatrix()
        renderer.setSize(cw, ch)
        labelRenderer.setSize(cw, ch)
      }
    }).observe(container)
  }

  threePlan = {
    scene: scene,
    camera: camera,
    renderer: renderer,
    labelRenderer: labelRenderer,
    planGroup: planGroup,
    roomGroup: roomGroup,
    roomMeshes: roomMeshes,
    roomLabels: roomLabels,
    energyParticles: energyParticles,
    rippleRings: rippleRings,
    cx: cx,
    cz: cz,
    resetActive: function () {
      if (activeMesh) {
        activeMesh.material.opacity = 0.18
        activeMesh.material.emissiveIntensity = 0.08
        activeMesh = null
      }
    },
    currentActive: null,
  }

  FloorplanData.onChange(function () {
    if (threePlan) rebuildThreeRooms()
  })
}

function renderFloorPlan(data) {
  if (!threePlan) initThreeFloorPlan()
  refreshThreeLabels()
}
