function initUserMenu() {
  document.querySelectorAll('[data-user-menu]').forEach((menu) => {
    const button = menu.querySelector('[data-user-menu-button]');
    if (!button) return;

    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const willOpen = !menu.classList.contains('is-open');
      document.querySelectorAll('[data-user-menu]').forEach((other) => {
        other.classList.remove('is-open');
        const otherButton = other.querySelector('[data-user-menu-button]');
        if (otherButton) otherButton.setAttribute('aria-expanded', 'false');
      });
      menu.classList.toggle('is-open', willOpen);
      button.setAttribute('aria-expanded', String(willOpen));
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('[data-user-menu]').forEach((menu) => {
      menu.classList.remove('is-open');
      const button = menu.querySelector('[data-user-menu-button]');
      if (button) button.setAttribute('aria-expanded', 'false');
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('[data-user-menu]').forEach((menu) => {
      menu.classList.remove('is-open');
      const button = menu.querySelector('[data-user-menu-button]');
      if (button) button.setAttribute('aria-expanded', 'false');
    });
  });
}

document.addEventListener('DOMContentLoaded', initUserMenu);