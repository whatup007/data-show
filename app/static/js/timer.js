/* Timer Page — ESP32 Digital Clock Showcase */
(function () {
  var WEEKDAYS = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'];

  var TIMEZONES = {
    'Asia/Shanghai': { name: '北京时间', offset: 8 },
    'America/New_York': { name: '纽约时间', offset: -4 },
    'Europe/London': { name: '伦敦时间', offset: 1 },
    'Asia/Tokyo': { name: '东京时间', offset: 9 }
  };

  function padZero(n) { return n.toString().padStart(2, '0'); }
  function formatTime(d) { return padZero(d.getHours()) + ':' + padZero(d.getMinutes()) + ':' + padZero(d.getSeconds()); }
  function formatDate(d) { return d.getFullYear() + '-' + padZero(d.getMonth() + 1) + '-' + padZero(d.getDate()); }
  function getTimeInZone(utc, offset) { return new Date(utc + offset * 3600000); }
  function getWeekday(d) { return WEEKDAYS[d.getDay()]; }

  function simTemp() { return (25 + Math.random() * 2 - 1).toFixed(1); }
  function simHumidity() { return Math.round(60 + Math.random() * 4 - 2); }

  function updateClock() {
    var now = new Date();
    var utc = now.getTime() - now.getTimezoneOffset() * 60000;

    var localTime = document.getElementById('local-time');
    var localDate = document.getElementById('local-date');
    var localWeekday = document.getElementById('local-weekday');
    var tempEl = document.getElementById('temperature');
    var humEl = document.getElementById('humidity');

    if (localTime) localTime.textContent = formatTime(now);
    if (localDate) localDate.textContent = formatDate(now);
    if (localWeekday) localWeekday.textContent = getWeekday(now);
    if (tempEl) tempEl.textContent = simTemp() + '°C';
    if (humEl) humEl.textContent = simHumidity() + '%';

    var keys = Object.keys(TIMEZONES);
    for (var i = 0; i < keys.length; i++) {
      var zone = keys[i];
      var tz = TIMEZONES[zone];
      var tzDate = getTimeInZone(utc, tz.offset);
      var el = document.querySelector('.timer-page [data-tz="' + zone + '"] .tz-time');
      if (el) el.textContent = formatTime(tzDate);
    }
  }

  function initTimezoneInteraction() {
    var items = document.querySelectorAll('.timer-page .timezone-item');
    for (var i = 0; i < items.length; i++) {
      items[i].addEventListener('click', function () {
        for (var j = 0; j < items.length; j++) items[j].classList.remove('active');
        this.classList.add('active');
      });
    }
  }

  function initScrollAnimations() {
    if (!('IntersectionObserver' in window)) return;
    var observer = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          entries[i].target.style.opacity = '1';
          entries[i].target.style.transform = 'translateY(0)';
        }
      }
    }, { threshold: 0.1 });

    var els = document.querySelectorAll('.timer-page .feature-card, .timer-page .arch-module, .timer-page .state-item, .timer-page .algo-step, .timer-page .cost-item, .timer-page .summary-item');
    for (var i = 0; i < els.length; i++) {
      els[i].style.opacity = '0';
      els[i].style.transform = 'translateY(20px)';
      els[i].style.transition = 'all 0.5s ease';
      observer.observe(els[i]);
    }
  }

  var clockInterval = null;

  function startClock() {
    if (clockInterval) clearInterval(clockInterval)
    updateClock()
    clockInterval = setInterval(updateClock, 1000)
  }

  window.startTimerPage = startClock

  function stopClock() {
    if (clockInterval) { clearInterval(clockInterval); clockInterval = null }
  }

  window.stopTimerPage = stopClock

  // ============ 鼾声监测 ============
  var snoreActive = false
  var snoreSocket = null
  var snoreMediaStream = null
  var snoreAudioCtx = null
  var snoreProcessor = null

  function initSnoreMonitor() {
    var toggleBtn = document.getElementById('snoreToggle')
    if (!toggleBtn) return

    toggleBtn.addEventListener('click', function () {
      if (snoreActive) {
        stopSnoreMonitor()
      } else {
        startSnoreMonitor()
      }
    })
  }

  function startSnoreMonitor() {
    if (!window.io) { alert('Socket.IO 未加载'); return }

    snoreSocket = io()
    snoreSocket.on('snore_result', function (data) {
      updateSnoreUI(data)
    })
    snoreSocket.on('connect_error', function () {
      addSnoreLog('连接失败，使用模拟模式')
      startSnoreSimulation()
      return
    })

    navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } })
      .then(function (stream) {
        snoreMediaStream = stream
        snoreAudioCtx = new AudioContext({ sampleRate: 16000 })
        var source = snoreAudioCtx.createMediaStreamSource(stream)
        snoreProcessor = snoreAudioCtx.createScriptProcessor(4096, 1, 1)

        snoreProcessor.onaudioprocess = function (e) {
          var input = e.inputBuffer.getChannelData(0)
          var int16 = new Int16Array(input.length)
          for (var i = 0; i < input.length; i++) {
            int16[i] = Math.max(-32768, Math.min(32767, input[i] * 32768))
          }
          if (snoreSocket && snoreSocket.connected) {
            snoreSocket.emit('snore_audio', int16.buffer)
          }
        }

        source.connect(snoreProcessor)
        snoreProcessor.connect(snoreAudioCtx.destination)
        snoreActive = true
        document.getElementById('snoreToggle').textContent = '停止监测'
        document.getElementById('snoreIndicator').className = 'snore-indicator monitoring'
        document.getElementById('snoreStatus').textContent = '监测中'
        addSnoreLog('麦克风已开启，开始监测')
      })
      .catch(function (err) {
        addSnoreLog('麦克风权限被拒绝: ' + err.message + '，使用模拟数据')
        startSnoreSimulation()
      })
  }

  function stopSnoreMonitor() {
    snoreActive = false
    if (snoreProcessor) { snoreProcessor.disconnect(); snoreProcessor = null }
    if (snoreAudioCtx) { snoreAudioCtx.close(); snoreAudioCtx = null }
    if (snoreMediaStream) { snoreMediaStream.getTracks().forEach(function (t) { t.stop() }); snoreMediaStream = null }
    if (snoreSocket) { snoreSocket.disconnect(); snoreSocket = null }

    document.getElementById('snoreToggle').textContent = '开始监测'
    document.getElementById('snoreIndicator').className = 'snore-indicator'
    document.getElementById('snoreStatus').textContent = '已停止'
    addSnoreLog('监测已停止')
  }

  function startSnoreSimulation() {
    snoreActive = true
    document.getElementById('snoreToggle').textContent = '停止监测'
    document.getElementById('snoreIndicator').className = 'snore-indicator monitoring'
    document.getElementById('snoreStatus').textContent = '监测中 (模拟)'

    var frameCount = 0
    var snoreCount = 0
    var simInterval = setInterval(function () {
      if (!snoreActive) { clearInterval(simInterval); return }
      frameCount++
      var isSnore = Math.random() > 0.6
      var score = isSnore ? (0.55 + Math.random() * 0.4) : Math.random() * 0.4
      var rms = 0.005 + Math.random() * 0.08
      if (isSnore) snoreCount++

      updateSnoreUI({
        is_snoring: isSnore,
        score: Math.round(score * 100) / 100,
        rms: Math.round(rms * 100000) / 100000,
        total: frameCount,
        snore_count: snoreCount,
      })
    }, 2000)
  }

  function updateSnoreUI(data) {
    var indicator = document.getElementById('snoreIndicator')
    var statusEl = document.getElementById('snoreStatus')
    var stateEl = document.getElementById('snoreState')
    var scoreEl = document.getElementById('snoreScore')
    var rmsEl = document.getElementById('snoreRms')
    var framesEl = document.getElementById('snoreFrames')
    var detectedEl = document.getElementById('snoreDetected')
    var barEl = document.getElementById('snoreBar')

    if (data.is_snoring) {
      indicator.className = 'snore-indicator snoring'
      stateEl.textContent = '鼾声'
      stateEl.style.color = '#ef4444'
      statusEl.textContent = '检测到鼾声'
    } else {
      indicator.className = 'snore-indicator monitoring'
      stateEl.textContent = '正常'
      stateEl.style.color = '#10b981'
      statusEl.textContent = '监测中'
    }

    scoreEl.textContent = data.score !== undefined ? data.score.toFixed(2) : '--'
    rmsEl.textContent = data.rms !== undefined ? data.rms.toFixed(5) : '--'
    framesEl.textContent = data.total || 0
    detectedEl.textContent = data.snore_count || 0
    barEl.style.width = (data.score || 0) * 100 + '%'

    if (data.detail) {
      addSnoreLog(data.is_snoring ? '鼾声' : '正常', data.detail)
    }
  }

  function addSnoreLog(tag, detail) {
    var log = document.getElementById('snoreLog')
    if (!log) return
    var time = new Date().toLocaleTimeString()
    var line = document.createElement('div')
    line.className = 'log-line'
    line.innerHTML = '<span class="log-time">' + time + '</span> <span class="log-tag">' + (tag || '') + '</span>' + (detail ? ' <span class="log-detail">' + detail + '</span>' : '')
    log.insertBefore(line, log.firstChild)
    if (log.children.length > 20) log.removeChild(log.lastChild)
  }

  // ============ 语音控制 ============
  var voiceActive = false
  var voiceSocket = null
  var voiceInput = null
  var voiceSend = null

  function initVoiceControl() {
    voiceInput = document.getElementById('voiceInput')
    voiceSend = document.getElementById('voiceSend')
    var toggleBtn = document.getElementById('voiceToggle')
    if (!toggleBtn) return

    toggleBtn.addEventListener('click', function () {
      if (voiceActive) {
        stopVoiceControl()
      } else {
        startVoiceControl()
      }
    })

    if (voiceSend) {
      voiceSend.addEventListener('click', function () {
        sendVoiceCommand()
      })
    }

    if (voiceInput) {
      voiceInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') sendVoiceCommand()
      })
    }

    document.querySelectorAll('.cmd-item').forEach(function (item) {
      item.addEventListener('click', function () {
        var cmd = item.dataset.cmd
        if (voiceInput) voiceInput.value = cmd
        sendVoiceCommand()
      })
    })
  }

  function startVoiceControl() {
    if (!window.io) { alert('Socket.IO 未加载'); return }

    voiceSocket = io()
    voiceSocket.on('voice_cmd_response', function (data) {
      addVoiceLog(data.text, data.reply, data.recognized)
    })
    voiceSocket.on('connect_error', function () {
      addVoiceLog('系统', '服务器连接失败', false)
    })

    voiceActive = true
    document.getElementById('voiceToggle').textContent = '停止监听'
    if (voiceInput) voiceInput.disabled = false
    if (voiceSend) voiceSend.disabled = false
    addVoiceLog('系统', '语音控制已启动', false)

    startVoiceRecognition()
  }

  function stopVoiceControl() {
    voiceActive = false
    if (voiceSocket) { voiceSocket.disconnect(); voiceSocket = null }
    document.getElementById('voiceToggle').textContent = '开始监听'
    if (voiceInput) voiceInput.disabled = true
    if (voiceSend) voiceSend.disabled = true
    addVoiceLog('系统', '语音控制已停止', false)
  }

  function sendVoiceCommand() {
    if (!voiceInput || !voiceInput.value.trim()) return
    var query = voiceInput.value.trim()
    if (voiceSocket && voiceSocket.connected) {
      voiceSocket.emit('voice_command', { query: query })
      addVoiceLog('用户', query, null)
    } else {
      addVoiceLog('系统', '未连接服务器', false)
    }
    voiceInput.value = ''
  }

  function startVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
      addVoiceLog('系统', '浏览器不支持语音识别，请使用文字输入', false)
      return
    }
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    var recognition = new SpeechRecognition()
    recognition.lang = 'zh-CN'
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onresult = function (event) {
      for (var i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          var text = event.results[i][0].transcript
          if (voiceInput) voiceInput.value = text
          sendVoiceCommand()
        }
      }
    }

    recognition.onerror = function (event) {
      if (event.error !== 'no-speech') {
        addVoiceLog('系统', '语音识别错误: ' + event.error, false)
      }
    }

    recognition.onend = function () {
      if (voiceActive) {
        try { recognition.start() } catch (e) {}
      }
    }

    try {
      recognition.start()
      addVoiceLog('系统', '语音识别已启动', false)
    } catch (e) {
      addVoiceLog('系统', '语音识别启动失败', false)
    }
  }

  function addVoiceLog(speaker, text, recognized) {
    var log = document.getElementById('voiceLog')
    if (!log) return
    var time = new Date().toLocaleTimeString()
    var line = document.createElement('div')
    var cls = recognized === true ? 'log-success' : (recognized === false ? 'log-info' : 'log-user')
    line.className = 'log-line ' + cls
    line.innerHTML = '<span class="log-time">' + time + '</span> <span class="log-tag">' + speaker + '</span> <span class="log-detail">' + text + '</span>'
    log.insertBefore(line, log.firstChild)
    if (log.children.length > 20) log.removeChild(log.lastChild)
  }

  document.addEventListener('DOMContentLoaded', function () {
    startClock()
    initTimezoneInteraction()
    initScrollAnimations()
    initSnoreMonitor()
    initVoiceControl()
  })
})()
