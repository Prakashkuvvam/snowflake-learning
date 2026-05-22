// Codebuff — Interactive exam: inline answer checking and score tracking
(function() {
  'use strict';
  function initExamInteractive() {
    var questions = document.querySelectorAll('.exam-question');
    if (!questions.length) return;
    var score = 0;
    var answered = 0;
    var total = questions.length;
    var scoreDisplay = document.createElement('div');
    scoreDisplay.className = 'exam-score';
    scoreDisplay.textContent = 'Score: 0/' + total;
    var container = document.querySelector('.exam-container');
    if (container) container.insertBefore(scoreDisplay, container.firstChild);
    else document.querySelector('.book-article')?.insertBefore(scoreDisplay, document.querySelector('.book-article').firstChild);
    questions.forEach(function(q, idx) {
      var options = q.querySelectorAll('.exam-option');
      var feedback = q.querySelector('.exam-feedback');
      if (!feedback) {
        feedback = document.createElement('div');
        feedback.className = 'exam-feedback';
        q.appendChild(feedback);
      }
      options.forEach(function(opt) {
        opt.addEventListener('click', function() {
          if (opt.dataset.checked === 'true') return;
          options.forEach(function(o) { o.dataset.checked = 'true'; o.style.cursor = 'default'; });
          var correct = opt.dataset.correct === 'true';
          if (correct) { score++; opt.classList.add('correct'); feedback.textContent = '✅ Correct!'; feedback.className = 'exam-feedback correct'; }
          else { opt.classList.add('incorrect'); var right = q.querySelector('[data-correct="true"]'); feedback.textContent = '❌ Incorrect. The correct answer was: ' + (right ? right.textContent : ''); feedback.className = 'exam-feedback incorrect'; }
          answered++;
          scoreDisplay.textContent = 'Score: ' + score + '/' + total;
          if (answered === total) {
            setTimeout(function() {
              scoreDisplay.textContent = '🏆 Final Score: ' + score + '/' + total + ' (' + Math.round(score/total*100) + '%)';
              scoreDisplay.classList.add('final');
            }, 500);
          }
        });
      });
    });
    var style = document.createElement('style');
    style.textContent = '.exam-score{font-size:1.2rem;font-weight:600;padding:10px 16px;background:#1e2128;border:1px solid #363b44;border-radius:8px;margin:16px 0;display:inline-block}.exam-score.final{background:#2ea043;color:#fff;border-color:#3fb950}.exam-question{margin:20px 0;padding:16px;background:#16181d;border:1px solid #363b44;border-radius:8px}.exam-question .exam-q-text{font-weight:600;margin-bottom:12px;color:#e1e4e8}.exam-option{display:block;width:100%;text-align:left;padding:10px 14px;margin:6px 0;background:#1e2128;border:1px solid #4a5161;border-radius:6px;color:#e1e4e8;cursor:pointer;transition:all .15s}.exam-option:hover{background:#2d323e;border-color:#6b7489}.exam-option.correct{background:#1a3a1a !important;border-color:#3fb950 !important;color:#7ee787 !important}.exam-option.incorrect{background:#3a1a1a !important;border-color:#f85149 !important;color:#ff7b72 !important}.exam-feedback{margin-top:10px;padding:8px 12px;border-radius:6px;font-size:.9rem}.exam-feedback.correct{background:#1a3a1a;color:#7ee787}.exam-feedback.incorrect{background:#3a1a1a;color:#ff7b72}';
    document.head.appendChild(style);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initExamInteractive);
  else initExamInteractive();
})();
