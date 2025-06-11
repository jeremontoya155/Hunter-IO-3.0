function toggleNav() {
  const sidebar = document.getElementById('mySidebar');
  const toggle = document.getElementById('toggle');

  if (sidebar.classList.contains('nav-collapsed')) {
    // Abrir el menú lateral
    sidebar.classList.remove('nav-collapsed');
    toggle.classList.remove('fa-bars');
    toggle.classList.add('fa-times');
  } else {
    // Cerrar el menú lateral
    sidebar.classList.add('nav-collapsed');
    toggle.classList.remove('fa-times');
    toggle.classList.add('fa-bars');
  }
}
console.log('Cambios');

// Opcional: Mejorar comportamiento de los tooltips
document.addEventListener('DOMContentLoaded', function () {
  const links = document.querySelectorAll('.nav-link');
  links.forEach((link) => {
    link.addEventListener('mouseenter', function () {
      this.style.zIndex = '1002'; // Asegura que el tooltip esté encima
    });
    link.addEventListener('mouseleave', function () {
      this.style.zIndex = '';
    });
  });
});
window.addEventListener('resize', () => {
  const sidebar = document.getElementById('mySidebar');
  const toggleIcon = document.getElementById('toggle');

  if (window.innerWidth <= 768) {
    sidebar.classList.add('nav-collapsed');
    toggleIcon?.classList.remove('fa-times');
    toggleIcon?.classList.add('fa-bars');
  }
});
