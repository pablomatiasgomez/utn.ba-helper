# Política de Privacidad - UTN.BA Helper

**Última actualización:** Enero 2026

## Introducción

UTN.BA Helper (ex Siga Helper) es una extensión de Chrome de código abierto diseñada para mejorar la experiencia de
navegación en el sitio web de la UTN - FRBA. Esta política de privacidad explica qué datos recopilamos, cómo los usamos,
almacenamos y compartimos.

## Datos que Recopilamos

### 1. Datos Académicos Anonimizados

- **Identificador de estudiante hasheado:** Tu legajo es convertido a un hash (código numérico irreversible) para
  identificar datos de forma anónima sin conocer tu identidad real.
- **Estadísticas académicas:** Peso académico, cantidad de materias aprobadas/desaprobadas, promedios de notas.

### 2. Datos de Cursadas

- Códigos de materias y cursadas
- Estructura del plan de estudios (materias que componen el plan y sus correlatividades)
- Horarios de clases
- Información de profesores (nombre, rol)
- Sede (Medrano, Campus, Virtual, etc.)

### 3. Encuestas Docentes

- Respuestas de encuestas docentes completadas en el sistema Kolla
- Nombre y rol del profesor evaluado

### 4. Datos de Diagnóstico

- Registros de errores de la extensión
- Información de sesión para análisis de rendimiento

## Cómo Usamos los Datos

Los datos recopilados se utilizan para:

1. **Mejorar la experiencia del usuario:**
    - Mostrar información de profesores anteriores al inscribirse a cursadas
    - Proveer búsqueda de docentes con sus evaluaciones
    - Visualizar el seguimiento de tu plan de estudios

2. **Contribuir a la comunidad:**
    - Los datos anonimizados de encuestas y horarios son agregados para beneficio de todos los usuarios
    - Ayudar a otros estudiantes a tomar decisiones informadas sobre cursadas

3. **Mejorar la extensión:**
    - Los datos de diagnóstico nos ayudan a identificar y corregir errores

## Almacenamiento de Datos

### Almacenamiento Local (en tu dispositivo)

- **Chrome Storage:** Almacenamos tu identificador hasheado y preferencias localmente usando `chrome.storage.sync`.
- **Local Storage del navegador:** Guardamos marcas de tiempo de la última recopilación de datos para evitar envíos
  duplicados.

### Almacenamiento en Servidor

- Los datos anonimizados se envían y almacenan en nuestro servidor (`pablomatiasgomez.com.ar/utnba-helper`) para ser
  agregados y compartidos con la comunidad.
- Los datos se transmiten de forma segura mediante HTTPS.

## Compartición de Datos

### Con Otros Usuarios

- Las encuestas docentes anonimizadas y los horarios de cursadas son compartidos de forma agregada con todos los
  usuarios de la extensión.
- **Nunca** compartimos información que pueda identificarte personalmente.

### Con Terceros

- **Embrace (embrace.io):** Utilizamos Embrace SDK para análisis de rendimiento y registro de errores. Embrace puede
  recopilar datos técnicos sobre sesiones de uso. Consulta
  su [política de privacidad](https://embrace.io/privacy-policy/).

### No Vendemos Datos

- **Nunca vendemos, alquilamos ni comercializamos tus datos personales.**

## Seguridad de los Datos

- Los identificadores de estudiante se convierten en hash antes de ser enviados al servidor.
- Todas las comunicaciones con nuestro servidor utilizan HTTPS (encriptación en tránsito).
- La extensión es de código abierto, permitiendo auditoría pública del código.

## Tus Derechos

- **Acceso al código:** Puedes revisar exactamente qué datos recopilamos en
  nuestro [repositorio de GitHub](https://github.com/pablomatiasgomez/utn.ba-helper).
- **Desinstalación:** Puedes desinstalar la extensión en cualquier momento para dejar de enviar datos.
- **Consultas:** Puedes contactarnos en pablomatiasgomez@gmail.com para preguntas sobre tus datos.

## Permisos de la Extensión

La extensión solicita los siguientes permisos:

- **storage:** Para guardar preferencias y datos localmente.
- **Acceso a sitios UTN:** Solo accedemos a `*.guarani.frba.utn.edu.ar` y `*.kolla.frba.utn.edu.ar` para funcionar
  correctamente.

## Cambios a esta Política

Podemos actualizar esta política de privacidad ocasionalmente. Los cambios significativos serán comunicados a través de
actualizaciones de la extensión.

## Contacto

Si tienes preguntas sobre esta política de privacidad o sobre el manejo de tus datos, puedes:

- Abrir un issue en [GitHub](https://github.com/pablomatiasgomez/utn.ba-helper/issues)
- Enviar un email a pablomatiasgomez@gmail.com

---

# Privacy Policy - UTN.BA Helper (English)

**Last updated:** January 2026

## Introduction

UTN.BA Helper (formerly Siga Helper) is an open-source Chrome extension designed to enhance the browsing experience on
the UTN - FRBA (Universidad Tecnológica Nacional - Facultad Regional Buenos Aires) website. This privacy policy explains
what data we collect, how we use it, store it, and share it.

## Data We Collect

### 1. Anonymized Academic Data

- **Hashed student ID:** Your student ID is converted to a hash (irreversible numeric code) to identify data anonymously
  without knowing your real identity.
- **Academic statistics:** Academic weight, number of passed/failed courses, grade averages.

### 2. Class Schedule Data

- Course and class codes
- Study plan structure (courses that make up the plan and their prerequisites)
- Class schedules
- Professor information (name, role)
- Campus location (Medrano, Campus, Virtual, etc.)

### 3. Professor Surveys

- Responses from professor surveys completed in the Kolla system
- Name and role of the evaluated professor

### 4. Diagnostic Data

- Extension error logs
- Session information for performance analysis

## How We Use Data

Collected data is used to:

1. **Improve user experience:**
    - Show previous professors when enrolling in classes
    - Provide professor search with their evaluations
    - Display your study plan progress

2. **Contribute to the community:**
    - Anonymized survey and schedule data is aggregated for the benefit of all users
    - Help other students make informed decisions about classes

3. **Improve the extension:**
    - Diagnostic data helps us identify and fix bugs

## Data Storage

### Local Storage (on your device)

- **Chrome Storage:** We store your hashed identifier and preferences locally using `chrome.storage.sync`.
- **Browser Local Storage:** We save timestamps of the last data collection to avoid duplicate submissions.

### Server Storage

- Anonymized data is sent and stored on our server (`pablomatiasgomez.com.ar/utnba-helper`) to be aggregated and shared
  with the community.
- Data is transmitted securely via HTTPS.

## Data Sharing

### With Other Users

- Anonymized professor surveys and class schedules are shared in aggregate form with all extension users.
- We **never** share information that could personally identify you.

### With Third Parties

- **Embrace (embrace.io):** We use Embrace SDK for performance analytics and error logging. Embrace may collect
  technical data about usage sessions. See their [privacy policy](https://embrace.io/privacy-policy/).

### We Do Not Sell Data

- **We never sell, rent, or trade your personal data.**

## Data Security

- Student identifiers are hashed before being sent to the server.
- All communications with our server use HTTPS (encryption in transit).
- The extension is open source, allowing public code auditing.

## Your Rights

- **Code access:** You can review exactly what data we collect in
  our [GitHub repository](https://github.com/pablomatiasgomez/utn.ba-helper).
- **Uninstallation:** You can uninstall the extension at any time to stop sending data.
- **Inquiries:** You can contact us at pablomatiasgomez@gmail.com with questions about your data.

## Extension Permissions

The extension requests the following permissions:

- **storage:** To save preferences and data locally.
- **UTN site access:** We only access `*.guarani.frba.utn.edu.ar` and `*.kolla.frba.utn.edu.ar` to function properly.

## Changes to This Policy

We may update this privacy policy occasionally. Significant changes will be communicated through extension updates.

## Contact

If you have questions about this privacy policy or how your data is handled, you can:

- Open an issue on [GitHub](https://github.com/pablomatiasgomez/utn.ba-helper/issues)
- Send an email to pablomatiasgomez@gmail.com
