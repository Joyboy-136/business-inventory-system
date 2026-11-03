(function () {
  hydrateIcons();
  if (Auth.current()) { location.replace('dashboard.html'); return; }
  showFlash();

  const form = $('#loginForm');
  const userInput = $('#username');
  const passInput = $('#password');
  const errorBox = $('#loginError');

  function showError(msg) { errorBox.textContent = msg; errorBox.classList.remove('hidden'); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errorBox.classList.add('hidden');

    const username = userInput.value;
    const password = passInput.value;
    if (!username.trim() || !password) {
      showError('Please enter your username and password.');
      (username.trim() ? passInput : userInput).focus();
      return;
    }
    const user = Auth.login(username, password);
    if (!user) {
      showError('Incorrect username or password.');
      passInput.value = '';
      passInput.focus();
      return;
    }
    location.href = 'dashboard.html';
  });
})();