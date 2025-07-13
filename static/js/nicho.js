document.addEventListener("DOMContentLoaded", () => {
  const choiceContainer = document.getElementById("choice-container");
  const choiceCards = document.querySelectorAll(".choice-card");
  const formSections = document.querySelectorAll(".form-section"); // Still needed for the other form
  const backButtons = document.querySelectorAll(
    '.back-button[data-action="show-choice"]'
  ); // Still needed for the other form

  // --- Function to show a section and hide others ---
  // This function is now only used for cards *other* than "Create your Target"
  function showSection(targetId) {
    if (choiceContainer) choiceContainer.style.display = "none";
    formSections.forEach((section) => section.classList.remove("active"));
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
      targetSection.classList.add("active");
    } else {
      console.warn(`Section with ID '${targetId}' not found.`);
      showChoiceScreen();
    }
  }

  // --- Function to show the choice screen ---
  // Still needed for "Back" button
  function showChoiceScreen() {
    formSections.forEach((section) => section.classList.remove("active"));
    if (choiceContainer) choiceContainer.style.display = "flex";
  }

  // --- Event Listeners for Choice Cards ---
  choiceCards.forEach((card) => {
    card.addEventListener("click", () => {
      const targetId = card.dataset.target;
      if (card.id === "mind-card") {
        window.location.href = "/huntermind"; // Redirige a la página huntermind.ejs
      } else if (targetId === "arco-form-section") {
        window.location.href = "/index";
      } else if (targetId === "blanco-form-section") {
        window.location.href = "/targets";
      } else if (targetId) {
        showSection(targetId);
      }
    });
  });

  // --- Event Listeners for "Back" Buttons ---
  // These buttons only appear in the "Create Arrow" form now, and return to the choice screen
  backButtons.forEach((button) => {
    button.addEventListener("click", showChoiceScreen);
  });

  // --- Ensure correct initial state ---
  const isActiveSection = document.querySelector(".form-section.active");
  // Show the choice screen if no section is active
  if (!isActiveSection && choiceContainer) {
    showChoiceScreen();
  }
  // NOTE: If you arrived at this page from a redirect, the sessionStorage
  // flag for nichoJustSubmitted might still be active and show an alert here.
  // This is a side effect of redirecting instead of showing the form.
  // Consider if you need this alert or if it should be handled on the /targets page.
});

document.addEventListener("DOMContentLoaded", () => {
  const hunterForm = document.getElementById("hunter-form");

  if (hunterForm) {
    hunterForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const textarea = document.getElementById("mensajes");
      let mensajes = textarea.value
        .split("\n")
        .map((m) => m.trim())
        .filter((m) => m.length > 0);

      // 🛡️ Validaciones
      const MAX_LINEAS = 100;
      const MAX_CARACTERES_POR_LINEA = 300;

      const contieneHTML = (text) => /<[^>]*>|javascript:/i.test(text);
      const errores = [];

      if (mensajes.length === 0) {
        errores.push("Debe ingresar al menos una flecha.");
      }

      if (mensajes.length > MAX_LINEAS) {
        errores.push(`Máximo ${MAX_LINEAS} flechas permitidas.`);
      }

      mensajes.forEach((linea, idx) => {
        if (linea.length > MAX_CARACTERES_POR_LINEA) {
          errores.push(`La flecha #${idx + 1} excede los ${MAX_CARACTERES_POR_LINEA} caracteres.`);
        }
        if (contieneHTML(linea)) {
          errores.push(`La flecha #${idx + 1} contiene código inválido (HTML/JS).`);
        }
      });

      if (errores.length > 0) {
        alert("Errores en el formulario:\n- " + errores.join("\n- "));
        return;
      }

      try {
        const csrfToken = document.querySelector('input[name="_csrf"]').value;

        const response = await fetch("/api/flecha/mensajes", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "CSRF-Token": csrfToken,
          },
          body: JSON.stringify({ mensajes }),
        });

        const result = await response.json();

        if (response.ok) {
          alert("¡Flechas guardadas correctamente!");
          textarea.value = "";
        } else {
          alert(`Error: ${result.error || "Error al guardar las flechas"}`);
        }
      } catch (error) {
        console.error("Error:", error);
        alert("Error al conectar con el servidor");
      }
    });
  }
});


document.addEventListener("DOMContentLoaded", () => {
  const nichoForm = document.getElementById("nicho-form");

  // This listener will only attach if the #nicho-form exists
  // and if the current page contains it AND the section is visible.
  // With the modification, the blanco-form-section is not shown,
  // so this script will not run in practice for the card flow.
  // It is highly recommended to MOVE this script to the /targets page
  // if that's where the niche is registered.

  if (nichoForm) {
    console.log(
      "nicho-form script loaded. If you see this and expect to be redirected by the card, something is wrong. The script should be on /targets."
    );
    nichoForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Get form data
      const ubicacion = document.getElementById("ubicacion").value;
      const tipo_personas = document.getElementById("tipo_personas").value;
      const edad_min = document.getElementById("edad_min").value;
      const edad_max = document.getElementById("edad_max").value;
      const cuentasTextarea = document.getElementById("cuentas");

      // Process accounts
      const cuentas = cuentasTextarea.value
        .split("\n")
        .map((cuenta) => cuenta.trim())
        .filter((cuenta) => cuenta.length > 0);

      // Basic validation
      if (!ubicacion || !tipo_personas || cuentas.length === 0) {
        return alert("Error: Location, interests, and accounts are required");
      }

      try {
        // First save the accounts as a new group
        const cuentasResponse = await fetch("/api/blancos/cuentas", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ cuentas }),
        });

        const cuentasResult = await cuentasResponse.json();

        if (!cuentasResponse.ok) {
          throw new Error(cuentasResult.error || "Error saving accounts");
        }

        // Then save the niche metadata
        // NOTE: The '/nicho' URL here may need adjustment if the endpoint
        // for saving metadata is elsewhere, perhaps on the /targets page.
        const nichoResponse = await fetch("/nicho", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ubicacion,
            tipo_personas,
            edad_min: edad_min || null,
            edad_max: edad_max || null,
            mensaje: `Account group saved on ${new Date().toLocaleString()}`,
          }),
        });

        if (nichoResponse.ok) {
          alert("Niche and accounts saved successfully!");
          // Clear form
          nichoForm.reset();
          cuentasTextarea.value = "";
          // Save flag for possible reload
          sessionStorage.setItem("nichoJustSubmitted", "true");
          // After saving, you may want to redirect to the niche list or another page
          // window.location.href = '/niche-list'; // Example
        } else {
          const errorResult = await nichoResponse.json();
          throw new Error(errorResult.error || "Error saving the niche");
        }
      } catch (error) {
        console.error("Error:", error);
        alert(`Error: ${error.message || "Error saving data"}`);
      }
    });
  }

  // Handle successful submission flag
  // If this script is moved to /targets, this part should go there too.
  const formSubmittedFlag = sessionStorage.getItem("nichoJustSubmitted");
  if (formSubmittedFlag === "true") {
    alert("Niche registered successfully!");
    sessionStorage.removeItem("nichoJustSubmitted");
  }
});
document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("mensajes");
  const lineCountLabel = document.getElementById("line-count");
  const charRemainingLabel = document.getElementById("char-remaining");

  const MAX_CARACTERES_POR_LINEA = 40;

  if (textarea && lineCountLabel && charRemainingLabel) {
    const actualizarContadores = () => {
      const cursorPos = textarea.selectionStart;
      let text = textarea.value;

      // Remover todos los espacios del texto
      text = text.replace(/ /g, "");

      const lineas = text.split("\n");

      // Flechas válidas (no vacías)
      const flechas = lineas.filter((l) => l.trim().length > 0);
      lineCountLabel.textContent = `${flechas.length} ${flechas.length === 1 ? "flecha" : "flechas"}`;

      // Línea actual donde está el cursor
      const hastaCursor = text.slice(0, cursorPos);
      const lineaActual = hastaCursor.split("\n").length - 1;
      const textoLineaActual = lineas[lineaActual] || "";

      const restantes = Math.max(0, MAX_CARACTERES_POR_LINEA - textoLineaActual.length);
      charRemainingLabel.textContent = `Quedan ${restantes} caract. en esta línea`;

      // Limitar caracteres por línea
      const lineasValidadas = lineas.map((l) => l.slice(0, MAX_CARACTERES_POR_LINEA));
      const textoFinal = lineasValidadas.join("\n");

      if (textoFinal !== textarea.value) {
        textarea.value = textoFinal;
        textarea.setSelectionRange(cursorPos - 1, cursorPos - 1);
      }
    };

    textarea.addEventListener("input", actualizarContadores);
    actualizarContadores();
    const pasteWarning = document.getElementById("paste-warning");

    // Manejar evento de pegado (bloquear si contiene espacios)
    textarea.addEventListener("paste", (e) => {
      const clipboardData = e.clipboardData || window.clipboardData;
      const pastedText = clipboardData.getData("text");

      if (/\s/.test(pastedText)) {
        e.preventDefault();
        mostrarAdvertencia();
      }
    });

    // Mostrar mensaje de advertencia durante 3 segundos
    function mostrarAdvertencia() {
      if (pasteWarning) {
        pasteWarning.classList.add("show");
        clearTimeout(pasteWarning.timeout);
        pasteWarning.timeout = setTimeout(() => {
          pasteWarning.classList.remove("show");
        }, 3000);
      }
    }

  }
});

