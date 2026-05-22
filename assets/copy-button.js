// Codebuff — copy code snippets to clipboard
(function() {
  'use strict';
  document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('pre:has(code)').forEach(function(block) {
      var wrapper = document.createElement('div');
      wrapper.style.position = 'relative';
      block.parentNode.insertBefore(wrapper, block);
      wrapper.appendChild(block);
      var btn = document.createElement('button');
      btn.className = 'copy-button';
      btn.textContent = '📋 Copy';
      btn.setAttribute('aria-label', 'Copy code to clipboard');
      btn.style.cssText = 'position:absolute;top:8px;right:8px;padding:4px 10px;font-size:12px;background:#363b44;color:#e1e4e8;border:1px solid #4a5161;border-radius:4px;cursor:pointer;z-index:10;opacity:0;transition:opacity 0.2s;';
      wrapper.appendChild(btn);
      wrapper.addEventListener('mouseenter', function() { btn.style.opacity = '1'; });
      wrapper.addEventListener('mouseleave', function() { btn.style.opacity = '0'; });
      btn.addEventListener('click', function() {
        var code = block.querySelector('code');
        var text = code ? code.innerText : block.innerText;
        navigator.clipboard.writeText(text).then(function() {
          btn.textContent = '✅ Copied!';
          setTimeout(function() { btn.textContent = '📋 Copy'; }, 2000);
        }).catch(function() {
          btn.textContent = '❌ Error';
          setTimeout(function() { btn.textContent = '📋 Copy'; }, 2000);
        });
      });
    });
  });
})();
