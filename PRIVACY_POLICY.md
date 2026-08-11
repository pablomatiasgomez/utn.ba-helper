# Política de Privacidad - UTN.BA Helper (Port para Firefox)

**Última actualización:** Agosto 2026

## Introducción

Este repositorio es un **port para Firefox** del proyecto original
[UTN.BA Helper](https://github.com/pablomatiasgomez/utn.ba-helper) (extensión de Chrome).
Es una extensión de código abierto que facilita el uso del sitio web de la **UTN - FRBA**
(SIU Guaraní). Esta política explica qué datos maneja la extensión y cómo los usa.

**Punto clave:** a diferencia del proyecto original, **este fork no tiene telemetría**.
No se usan SDK de análisis (como Embrace) ni se envían registros de errores ni estadísticas de
uso a servidores de análisis.

## Datos que maneja la extensión

### 1. Contenido de las páginas de la UTN (para las funciones de la extensión)

Para mostrar sus secciones, la extensión lee y procesa el contenido visible en las páginas de
Guaraní y Kolla en las que estás logueado:

- **Encuestas docentes:** las respuestas que completás en el sistema Kolla (nombre y rol del
  profesor evaluado, respuestas a las preguntas).
- **Horarios de cursadas:** códigos de materia y cursada, horarios, sedes (Medrano, Campus,
  Virtual, etc.), información de profesores (nombre, rol).
- **Datos de tu plan de estudios:** materias aprobadas/desaprobadas/regularizadas, correlatividades
  y peso académico, calculado localmente para la sección "Seguimiento de Plan".

### 2. Identificador de estudiante anonimizado

- Tu legajo se convierte a un **hash** (código numérico irreversible) para identificar los datos
  enviados al servidor comunitario sin conocer tu identidad real.

### 3. Lo que la extensión NO maneja

- **No** envía registros de errores, "logs" o métricas de uso a servidores de análisis.
- **No** recopila tu historial de navegación fuera de los dominios de la UTN.
- **No** vende, alquila ni comercializa datos personales.

## Cómo se usan los datos

### Almacenamiento local (en tu dispositivo)

- **`browser.storage.sync`:** se guarda tu identificador hasheado.
- **Local Storage:** se guardan marcas de tiempo de la última recopilación de datos, para evitar
  envíos duplicados.

### Envío al servidor comunitario

- Para que las funciones *Buscar Docentes*, *Buscar Cursos*, *Seguimiento de Plan* y las
  predicciones de profesores funcionen, la extensión envía datos anonimizados (con tu legajo
  hasheado) al servidor comunitario del proyecto original: `pablomatiasgomez.com.ar/utnba-helper`.
- Esa información se agrega para beneficio de todos los usuarios de la extensión.
- La transmisión se realiza por HTTPS.
- Si ese servidor no está disponible, la extensión no envía nada y las secciones que dependen de
  él muestran un aviso.

## Permisos de la extensión

La extensión solicita los siguientes permisos en el manifest:

- **`storage`** — para guardar tu identificador hasheado y datos locales.
- **Hosts de la UTN** — acceso de contenido a `*.guarani.frba.utn.edu.ar` y
  `*.kolla.frba.utn.edu.ar`.
- **Host del servidor comunitario** — `www.pablomatiasgomez.com.ar`, para poder comunicarse con el
  backend y funcionar con o sin CORS.
- **`data_collection_permissions: websiteContent`** — declaración requerida por Firefox para
  informar al usuario que la extensión transmite contenido de las webs donde se usa (los datos de
  Guarani/Kolla descriptos arriba).

## Seguridad

- Los identificadores de estudiante se **hashean** antes de enviarse al servidor.
- Todas las comunicaciones usan **HTTPS**.
- La extensión es **código abierto** y puede auditarse públicamente en este repositorio.

## Tus derechos

- **Acceso al código:** podés revisar exactamente qué hace la extensión en
  este [repositorio](https://github.com/rocopolas/utn.ba-helper-firefox).
- **Desinstalación:** podés desinstalar la extensión en cualquier momento para detener la
  recopilación y el envío de datos.
- **Consultas:** podés abrir un issue en este repositorio ante cualquier duda sobre tus datos.

## Cambios a esta política

Podemos actualizar esta política ocasionalmente. Los cambios significativos se comunicarán a través
de las notas de cada versión (release).

## Contacto

Si tenés preguntas sobre esta política de privacidad o sobre el manejo de tus datos, podés:

- Abrir un issue en [GitHub](https://github.com/rocopolas/utn.ba-helper-firefox/issues).
