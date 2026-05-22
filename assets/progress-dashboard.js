// Codebuff — Progress dashboard with localStorage tracking
(function() {
  'use strict';
  function initProgressDashboard() {
    var storageKey = 'codebuff_snowflake_progress';
    var progressData = JSON.parse(localStorage.getItem(storageKey) || '{}');
    function saveProgress() { localStorage.setItem(storageKey, JSON.stringify(progressData)); }
    var checkboxes = document.querySelectorAll('.progress-checkbox');
    checkboxes.forEach(function(cb) {
      var key = cb.dataset.chapter;
      if (key && progressData[key]) cb.checked = true;
      cb.addEventListener('change', function() {
        if (key) {
          if (cb.checked) progressData[key] = true;
          else delete progressData[key];
          saveProgress();
          updateStats();
        }
      });
    });
    function updateStats() {
      var total = checkboxes.length;
      var done = Object.keys(progressData).length;
      var pct = total > 0 ? Math.round(done / total * 100) : 0;
      var bar = document.querySelector('.progress-bar-fill');
      if (bar) bar.style.width = pct + '%';
      var text = document.querySelector('.progress-stats');
      if (text) text.textContent = done + '/' + total + ' chapters (' + pct + '%)';
    }
    updateStats();
    var resetBtn = document.querySelector('.progress-reset');
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        if (confirm('Reset all progress?')) {
          progressData = {};
          saveProgress();
          checkboxes.forEach(function(cb) { cb.checked = false; });
          updateStats();
        }
      });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initProgressDashboard);
  else initProgressDashboard();
})();
