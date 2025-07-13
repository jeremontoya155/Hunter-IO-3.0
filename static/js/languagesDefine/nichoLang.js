import { initLanguageManager } from '/static/js/langManager.js';

const translations = {
    es: {
      createArrow: "Crea tu Flecha",
      arrowDesc: "Configura una nueva instancia de Hunter para empezar.",
      createBow: "Crea tu Arco",
      bowDesc: "Configura un nuevo lanzador para tus campañas.",
      createTarget: "Crea tu Blanco",
      targetDesc: "Define un nuevo nicho objetivo con sus características.",
      createMind: "Crea tu Mente",
      mindDes: "Configura tu Mente Hunter para estrategias avanzadas.",
      uploadMessages: "CARGA TU LISTA DE MENSAJES",
      startHunt: "Inicia una nueva caza.",
      arrowsLabel: "Flechas:",
      arrowsSmall: "Recordá insertarlas con salto de línea",
      backButton: "Volver",
      startHunterButton: "Iniciar Hunter",
      newTargetRegister: "Registrar Nuevo Blanco",
      newTargetRegisterDesc: "Define los detalles de tu público objetivo.",
      location: "Ubicación:",
      interests: "Intereses (separados por coma):",
      ageMin: "Edad Mínima:",
      ageMax: "Edad Máxima:",
      targetsAccounts: "Cuentas Objetivo:",
      noteDesc: "Separá cada cuenta con un salto de línea",
      saveButton: "Guardar Blanco",
    },
    en: {
      createArrow: "Create your Arrow",
      arrowDesc: "Set up a new Hunter instance to get started.",
      createBow: "Create your Bow",
      bowDesc: "Configure a new launching weapon for your campaigns.",
      createTarget: "Create your Target",
      targetDesc: "Define a new target niche with its characteristics.",
      createMind: "Create your Mind",
      mindDes: "Configure your Hunter Mind for advanced strategies.",
      uploadMessages: "UPLOAD YOUR MESSAGE LIST",
      startHunt: "Start a new hunt.",
      arrowsLabel: "Arrows:",
      arrowsSmall: "Remember to insert the <strong><em>arrows</em></strong> with line breaks",
      backButton: "Back",
      startHunterButton: "Start Hunter",
      newTargetRegister: "Register New Target",
      newTargetRegisterDesc: "Define the details of your target audience.",
      location: "Location:",
      interests: "Interests (comma separated):",
      ageMin: "Minimum Age:",
      ageMax: "Maximum Age:",
      targetsAccounts: "Target Accounts:",
      noteDesc: "Separate each account with a line break",
      saveButton: "Save Target",
    }
  };

document.addEventListener('DOMContentLoaded', () => {
  initLanguageManager(translations);
});
