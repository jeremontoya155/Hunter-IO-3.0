import { initLanguageManager } from '/static/js/langManager.js';

const translations = {
    es: {
      platformChoiceTitle: "Elige tu canal:",
      addAccount: "Agregar Cuenta",
      manageTargets: "Gestionar Cuentas Objetivo",
      connectedAccounts: "Cuentas Conectadas:",
      noAccounts: "No hay cuentas conectadas aún.",
      cargaUsuarios:"¡Carga aquí tus usuarios para ver sus avances!",
      gestionTitle:'Gestión de cuentas objetivos.',
      gestionDesc:'Carga o actualiza la lista de cuentas de Instagram a las que dirigir tus acciones de manera automática y eficiente.'
    },
    en: {
      platformChoiceTitle: "Choose your channel:",
      addAccount: "Add Account",
      manageTargets: "Manage Target Accounts",
      connectedAccounts: "Connected Accounts:",
      noAccounts: "No accounts connected yet.",
      cargaUsuarios:"Upload your users here to track their progress!",
      gestionTitle:'Account management objectives',
      gestionDesc:'Upload or update the list of Instagram accounts to target your actions automatically and efficiently.'
    }
  };

document.addEventListener('DOMContentLoaded', () => {
  initLanguageManager(translations);
});
