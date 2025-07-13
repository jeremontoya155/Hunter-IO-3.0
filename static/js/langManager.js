// static/js/langManager.js
export function initLanguageManager(translations) {
  const langBtns = {
    es: document.getElementById("btn-es"),
    en: document.getElementById("btn-en"),
  };

  function changeLanguage(lang) {
    const elements = document.querySelectorAll("[data-translate-key]");
    elements.forEach((el) => {
      const key = el.getAttribute("data-translate-key");
      const useHTML = el.getAttribute("data-html") === "true";
      const translation = translations?.[lang]?.[key];

      if (translation) {
        if (el.placeholder !== undefined) {
          el.placeholder = translation;
        } else if (useHTML) {
          el.innerHTML = translation;
        } else {
          el.textContent = translation;
        }
      }
    });

    Object.values(langBtns).forEach((btn) => {
      if (btn) btn.classList.remove("active");
    });
    langBtns[lang]?.classList.add("active");

    localStorage.setItem("preferredLanguage", lang);
  }

  // Evento de botones
  langBtns.es?.addEventListener("click", () => changeLanguage("es"));
  langBtns.en?.addEventListener("click", () => changeLanguage("en"));

  // Idioma inicial
  const savedLang = localStorage.getItem("preferredLanguage") || "es";
  changeLanguage(savedLang);
}
