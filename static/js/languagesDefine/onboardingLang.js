import { initLanguageManager } from '/static/js/langManager.js';

const translations = {
    es: {
      title: 'HUNTER - Bienvenida y Primeros Pasos',
          // HTML ajustado para la nueva estructura del encabezado
          mainHeadingHTML: `<span class='intro-text'>Bienvenido a</span> <span class='highlight'>HUNTER</span><span class='slogan'>Donde no esperamos oportunidades — las creamos y las cazamos</span>`,
          step1Title: 'Inicia Sesión y Desbloquea el Poder',
          step1Intro:
            'Para comenzar tu cacería de resultados, completa estas tareas:',
          step1List: [
            // Solo texto, el HTML (checkbox + label) se genera en JS
            'Accede a Instagram: Introduce tus credenciales de forma segura.',
            'Mensajes Personalizados: Sube tu archivo con mensajes irresistibles.',
            'Preguntas Clave: Define las preguntas que activarán tu estrategia.',
            'Lista de Objetivos: Carga tu archivo con las cuentas a contactar.',
            '¡Inicia Sesión!: Presiona el botón y deja que HUNTER haga su magia.',
          ],
          step1TutorialLinkText: 'Ver Tutorial Paso 1',
          step2Title: 'Explora tu Centro de Mando: El Dashboard',
          step2Intro:
            'Una vez dentro, el <strong>DASHBOARD</strong> será tu torre de control. Revisa estos puntos:',
          step2List: [
            // Solo texto
            'Métricas Clave: Visualiza mensajes enviados y rendimiento al instante.',
            'Estadísticas Precisas: Entiende qué funciona y optimiza tu enfoque.',
            'Actividad y Crecimiento: Observa el impacto directo en tu perfil.',
          ],
          step2TutorialLinkText: 'Ver Tutorial Paso 2',
          step3Title: 'Navega con Agilidad: Panel Lateral',
          step3Intro:
            'El panel lateral izquierdo es tu arsenal de herramientas. Familiarízate con:',
          step3List: [
            // Solo texto
            'Dashboard: Tu vista principal, siempre accesible.',
            'Perfil y Análisis: Profundiza en el crecimiento y la interacción.',
            'Configuración: Personaliza HUNTER a tu medida.',
          ],
          step3TutorialLinkText: 'Ver Tutorial Paso 3',
          footerCta: ' Tus metas son nuestro blanco ', // Solo CTA
          contactLinkText: 'Contáctanos', // Texto para el enlace de contacto
    },
    en: {
      title: 'HUNTER - Welcome and First Steps',
          // HTML ajustado para la nueva estructura del encabezado
          mainHeadingHTML: `<span class='intro-text'>Welcome to</span> <span class='highlight'>HUNTER</span><span class='slogan'>Where we don't wait for opportunities  we create and hunt them</span>`,
          step1Title: 'Log In and Unlock the Power',
          step1Intro: 'To start your results hunt, complete these tasks:',
          step1List: [
            // Just text
            'Access Instagram: Enter your credentials securely.',
            'Customized Messages: Upload your file with irresistible messages.',
            'Key Questions: Define the questions that will activate your strategy.',
            'Target List: Load your file with accounts to contact.',
            'Log In!: Press the button and let HUNTER work its magic.',
          ],
          step1TutorialLinkText: 'Watch Step 1 Tutorial',
          step2Title: 'Explore your Command Center: The Dashboard',
          step2Intro:
            'Once inside, the <strong>DASHBOARD</strong> will be your control tower. Review these points:',
          step2List: [
            // Just text
            'Key Metrics: Visualize sent messages and performance instantly.',
            'Precise Statistics: Understand what works and optimize your approach.',
            'Activity and Growth: Observe the direct impact on your profile.',
          ],
          step2TutorialLinkText: 'Watch Step 2 Tutorial',
          step3Title: 'Navigate with Agility: Side Panel',
          step3Intro:
            'The left side panel is your toolkit arsenal. Familiarize yourself with:',
          step3List: [
            // Just text
            'Dashboard: Your main view, always accessible.',
            'Profile and Analysis: Dive deep into growth and interaction.',
            'Settings: Customize HUNTER to your measure.',
          ],
          step3TutorialLinkText: 'Watch Step 3 Tutorial',
          footerCta: 'Your goals are our target', // Just CTA (removed icons for simplicity)
          contactLinkText: 'Contact Us', // Text for the contact link
    }
  };

document.addEventListener('DOMContentLoaded', () => {
  initLanguageManager(translations);
});

