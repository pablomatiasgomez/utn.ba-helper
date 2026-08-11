<div align="center">
  <img src="https://raw.githubusercontent.com/pablomatiasgomez/utn.ba-helper/master/public/icons/icon128.png" alt="logo">

  # UTN.BA Helper - Port para Firefox

  **Fork para Firefox/Gecko** del proyecto original [utn.ba-helper](https://github.com/pablomatiasgomez/utn.ba-helper) de [Pablo Matías Gomez](https://github.com/pablomatiasgomez). Extensión que facilita el uso del sitio de la **UTN - FRBA** (SIU Guaraní).
</div>

## Diferencias con el original

- **Firefox** — adaptado a Manifest V3 de Gecko (`background.scripts`, `browser_specific_settings.gecko`, APIs `browser.*`); versión mínima Firefox 109. Funciona también en Zen Browser.
- **Sin telemetría** — se eliminaron el SDK de Embrace y el logging/estadísticas (`logMessage`, `logUserStat`). No se envían datos de uso ni errores a servidores de análisis.
- Header `X-Client: FIREFOX@<versión>`.

El resto de las funcionalidades (Buscar Docentes, Buscar Cursos, Seguimiento de Plan, horarios en la Agenda) son idénticas al original.

## Instalación y privacidad

- Guía: [GUIA_DE_INSTALACION.md](GUIA_DE_INSTALACION.md)
- Política de privacidad: [PRIVACY_POLICY.md](PRIVACY_POLICY.md)

## Créditos

- Original: [pablomatiasgomez/utn.ba-helper](https://github.com/pablomatiasgomez/utn.ba-helper)
- Este port: [rocopolas/utn.ba-helper-firefox](https://github.com/rocopolas/utn.ba-helper-firefox)