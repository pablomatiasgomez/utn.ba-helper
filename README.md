<h2 align="center">UTN.BA Helper - Port para Firefox</h2>

<p align="center">
	<a href="https://github.com/pablomatiasgomez/utn.ba-helper"><img src="https://img.shields.io/github/stars/pablomatiasgomez/utn.ba-helper?label=proyecto%20original" alt="original"></a>
	<a href="https://github.com/rocopolas/utn.ba-helper-firefox"><img src="https://img.shields.io/github/stars/rocopolas/utn.ba-helper-firefox?label=este%20fork" alt="fork"></a>
</p>

<p align="center"><img src="https://raw.githubusercontent.com/pablomatiasgomez/utn.ba-helper/master/public/icons/icon128.png" alt="logo"></p>

## Qué es esto

**UTN.BA Helper (port para Firefox)** es un port del proyecto original
[utn.ba-helper](https://github.com/pablomatiasgomez/utn.ba-helper) de
[Pablo Matías Gomez](https://github.com/pablomatiasgomez), una extensión que facilita el uso del
sitio web de la **UTN - FRBA** (SIU Guaraní). Este fork adapta la extensión para que funcione en
**Firefox** y navegadores basados en Gecko (como **Zen Browser**).

## Diferencias con el proyecto original

El código base es el mismo, pero este fork cambia:

1. **Destino Firefox** — El manifest fue adaptado a las reglas de Firefox para Manifest V3:
   - `background.scripts` (event page) en lugar de `service_worker`.
   - `web_accessible_resources` sin `use_dynamic_url` (no soportado por Firefox).
   - `browser_specific_settings.gecko` con id, versión mínima (109) y `data_collection_permissions`.
2. **APIs `browser.*`** — `browser.runtime` y `browser.storage.sync` en lugar de `chrome.*`
   (con promesas nativas de Firefox).
3. **Sin telemetría** — Se eliminó por completo:
   - El SDK de **Embrace** (`@embrace-io/web-sdk`) y su proceso de subida de sourcemaps.
   - El **logging al backend** (`logMessage`) y las **estadísticas de usuario** (`logUserStat`).
   - Errores y datos de uso ya **no** se reportan a ningún servidor de análisis.
4. **Header de cliente** — `X-Client: FIREFOX@<versión>` para que el servidor comunitario
   reconozca la procedencia de los datos.
5. **Robustez** — Las secciones que leen del servidor comunitario ya no fallan si la respuesta
   no es un array: muestran un mensaje claro en su lugar.

## Funcionalidades

UTN.BA Helper facilita el uso de la web de la UTN - FRBA:

- Colecta anónimamente distintos datos, para ser utilizados en las distintas secciones, como:
  - Las encuestas docentes para poder publicar esta información en la sección de "Buscar Docentes" e incluso mostrarla al momento de inscribirse a un curso.
  - Los horarios de las cursadas para mostrar esta información al momento de inscribirse a un nuevo curso, y poder intentar predecir cuál va a ser el profesor que va a estar en cada cursada.
- Al momento de inscribirse a materias, muestra los profesores que estuvieron en cada cursada, basándose en data colectada, para así poder saber qué profesor va a estar en cada curso.
- Agrega nuevas secciones bajo el menú "UTN.BA Helper":
  - **Buscar Docentes**, donde se puede ver información colectada, entre ello, la encuesta docente.
  - **Buscar Cursos**, donde se puede ver información de cursos pasados, como horarios, profesores que estuvieron en cada uno, etc.
  - **Seguimiento de Plan**:
    - Se visualiza el estado actual del plan, viendo materias aprobadas, habilitadas para rendir final, por cursar, etc.
    - Peso académico, cantidad de finales aprobados y desaprobados.
    - Promedio de notas ponderadas (según Ordenanza Nº 1549) y no ponderadas, contando y sin contar desaprobados.
- Agrega el nombre de la materia en la grilla de horarios en la sección de Agenda.

## Requisitos

- **Firefox 109+** (o un navegador compatible con WebExtensions de Gecko, como Zen Browser).

## Instalación

Mira la guía completa en **[GUIA_DE_INSTALACION.md](GUIA_DE_INSTALACION.md)**.

## Compilación desde el código fuente

Requisitos: Node.js 22+.

```bash
npm ci
npm test          # tests unitarios (jest)
npm run build     # genera la carpeta build/
npm run pack      # genera el zip en release/
```

Para probar en vivo durante el desarrollo:

```bash
npx web-ext run --source-dir build --firefox "/Applications/Zen.app/Contents/MacOS/zen"
```

Para validar contra las reglas de addons.mozilla.org:

```bash
npx web-ext lint --source-dir build
```

## Notas sobre el backend comunitario

Las secciones *Buscar Docentes*, *Buscar Cursos*, el *Seguimiento de Plan* y las predicciones de
profesores dependen del servidor comunitario del proyecto original
(`pablomatiasgomez.com.ar/utnba-helper`). Si ese servidor no devuelve datos (o está caído),
esas secciones mostrarán un aviso en lugar de errores. Las secciones que se alimentan del DOM de
Guaraní (Horarios, por ejemplo) funcionan sin conexión a ese servidor.

## Privacidad

La **política de privacidad** está disponible en [PRIVACY_POLICY.md](PRIVACY_POLICY.md).
A diferencia del proyecto original, este fork **no** usa Embrace ni envía datos de uso/errores a
servidores de análisis.

## Créditos

- **Proyecto original:** [pablomatiasgomez/utn.ba-helper](https://github.com/pablomatiasgomez/utn.ba-helper)
  (extensión para Chrome).
- **Autor original:** Pablo Matías Gomez.
- **Este port:** [rocopolas/utn.ba-helper-firefox](https://github.com/rocopolas/utn.ba-helper-firefox).

## Glosario

|  Inglés  | Español    |
|---------:|:-----------|
|   Course | Materia    |
|    Class | Cursada    |
| Elective | Optativa   |
|    Grade | Nota       |
|   Signed | Firmada    |
|   Passed | Aprobada   |
|   Failed | Desaprobada|
