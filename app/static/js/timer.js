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

  document.addEventListener('DOMContentLoaded', function () {
    startClock()
    initTimezoneInteraction()
    initScrollAnimations()
  })
})()
