(function () {
  var modal = document.getElementById('who-modal');
  var closeBtn = document.getElementById('modal-close');
  if (!modal) return;

  var lastFocused = null;

  window.openWhoModal = function (triggerEl) {
    lastFocused = triggerEl || document.activeElement;
    modal.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    if (closeBtn) closeBtn.focus();
  };

  window.closeWhoModal = function () {
    modal.classList.remove('is-open');
    document.body.style.overflow = '';
    if (lastFocused && lastFocused.focus) lastFocused.focus();
  };

  if (closeBtn) closeBtn.addEventListener('click', window.closeWhoModal);

  modal.addEventListener('click', function (e) {
    if (e.target === modal) window.closeWhoModal();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modal.classList.contains('is-open')) window.closeWhoModal();
  });

  var whyDifferent = document.getElementById('why-different-btn');
  if (whyDifferent) {
    whyDifferent.addEventListener('click', function () {
      whyDifferent.classList.add('is-open-note');
    });
  }
})();
