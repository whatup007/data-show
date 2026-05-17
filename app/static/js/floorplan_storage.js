var FloorplanStorage = (function () {
  var STORAGE_KEY = "aura_floorplan_design"

  function save(rooms) {
    try {
      var json = JSON.stringify(rooms)
      localStorage.setItem(STORAGE_KEY, json)
      return true
    } catch (e) {
      return false
    }
  }

  function load() {
    try {
      var json = localStorage.getItem(STORAGE_KEY)
      if (!json) return null
      var data = JSON.parse(json)
      if (!Array.isArray(data)) return null
      return data
    } catch (e) {
      return null
    }
  }

  function clear() {
    localStorage.removeItem(STORAGE_KEY)
  }

  function hasSaved() {
    return localStorage.getItem(STORAGE_KEY) !== null
  }

  return {
    save: save,
    load: load,
    clear: clear,
    hasSaved: hasSaved
  }
})()
