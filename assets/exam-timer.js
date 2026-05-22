// Codebuff — 60-minute exam timer for practice tests
(function() {
  'use strict';
  function initExamTimer() {
    var timerContainer = document.querySelector('.exam-timer');
    if (!timerContainer) return;
    var totalSeconds = 3600;
    var timerId = null;
    var running = false;
    var display = timerContainer.querySelector('.timer-display');
    var startBtn = timerContainer.querySelector('.timer-start');
    var pauseBtn = timerContainer.querySelector('.timer-pause');
    var resetBtn = timerContainer.querySelector('.timer-reset');
    if (!display) {
      display = document.createElement('span');
      display.className = 'timer-display';
      display.textContent = '60:00';
      timerContainer.appendChild(display);
    }
    function formatTime(secs) {
      var m = Math.floor(secs / 60);
      var s = secs % 60;
      return m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
    }
    function updateDisplay() { if (display) display.textContent = formatTime(totalSeconds); }
    function tick() {
      if (totalSeconds <= 0) {
        clearInterval(timerId);
        running = false;
        if (display) display.textContent = '⏰ Time\'s up!';
        if (startBtn) startBtn.disabled = false;
        if (pauseBtn) pauseBtn.disabled = true;
        return;
      }
      totalSeconds--;
      updateDisplay();
    }
    function startTimer() {
      if (running) return;
      running = true;
      if (startBtn) startBtn.disabled = true;
      if (pauseBtn) pauseBtn.disabled = false;
      timerId = setInterval(tick, 1000);
    }
    function pauseTimer() {
      if (!running) return;
      clearInterval(timerId);
      running = false;
      if (startBtn) startBtn.disabled = false;
      if (pauseBtn) pauseBtn.disabled = true;
    }
    function resetTimer() {
      clearInterval(timerId);
      running = false;
      totalSeconds = 3600;
      updateDisplay();
      if (startBtn) startBtn.disabled = false;
      if (pauseBtn) pauseBtn.disabled = true;
    }
    if (startBtn) startBtn.addEventListener('click', startTimer);
    if (pauseBtn) pauseBtn.addEventListener('click', pauseTimer);
    if (resetBtn) resetBtn.addEventListener('click', resetTimer);
    if (pauseBtn) pauseBtn.disabled = true;
    var style = document.createElement('style');
    style.textContent = '.exam-timer{display:inline-flex;align-items:center;gap:12px;padding:12px 20px;background:#1e2128;border:1px solid #363b44;border-radius:8px;margin:16px 0}.exam-timer .timer-display{font-size:1.5rem;font-weight:700;font-variant-numeric:tabular-nums;color:#e1e4e8;min-width:80px}.exam-timer button{padding:6px 16px;border-radius:4px;cursor:pointer;font-size:.85rem;transition:all .15s}.exam-timer .timer-start{background:#2ea043;color:#fff;border:1px solid #3fb950}.exam-timer .timer-start:hover{background:#3fb950}.exam-timer .timer-pause{background:#d29922;color:#fff;border:1px solid #e3b341}.exam-timer .timer-pause:hover{background:#e3b341}.exam-timer .timer-reset{background:#363b44;color:#e1e4e8;border:1px solid #4a5161}.exam-timer .timer-reset:hover{background:#4a5161}.exam-timer button:disabled{opacity:.5;cursor:not-allowed}';
    document.head.appendChild(style);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initExamTimer);
  else initExamTimer();
})();
