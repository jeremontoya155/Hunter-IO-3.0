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
      const cuentas = textarea.value
        .split("\n")
        .map((cuenta) => cuenta.trim())
        .filter((cuenta) => cuenta.length > 0);

      try {
        const response = await fetch("/api/flecha/mensajes", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ mensajes: cuentas }),
        });

        const result = await response.json();

        if (response.ok) {
          alert("Messages saved successfully!");
          textarea.value = "";
        } else {
          alert(`Error: ${result.error || "Error saving messages"}`);
        }
      } catch (error) {
        console.error("Error:", error);
        alert("Error connecting to the server");
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
