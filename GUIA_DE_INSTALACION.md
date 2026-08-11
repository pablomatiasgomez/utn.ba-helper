# Guía de instalación - UTN.BA Helper (Port para Firefox)

Esta guía explica cómo instalar **UTN.BA Helper** en tu navegador. Requisito mínimo:
**Firefox 109+** o un navegador compatible con WebExtensions de Gecko (ej.: **Zen Browser**).

> ⚠️ Mientras la extensión no esté firmada para addons.mozilla.org (AMO), la única forma de
> instalarla es **temporal** (se desactiva al cerrar el navegador) u obtener un **.xpi firmado**.

---

## Índice

1. [Instalación temporal (recomendada para probar)](#1-instalación-temporal)
2. [Instalar en Zen Browser](#2-instalar-en-zen-browser)
3. [Instalar como extensión firmada (definitiva)](#3-instalar-como-extensión-firmada-definitiva)
4. [Compilar la extensión desde el código](#4-compilar-la-extensión-desde-el-código)
5. [Cómo verificar que funciona](#5-cómo-verificar-que-funciona)
6. [Solución de problemas](#6-solución-de-problemas)

---

## 1. Instalación temporal

Es el método más rápido. Sirve para probar la extensión; se pierde cada vez que cerrás el navegador.

### Pasos

1. **Generá el `build/`** (si no tenés el zip de la release, ver [sección 4](#4-compilar-la-extensión-desde-el-código)).
   - Si descargaste un **zip** de una release: descomprimilo en una carpeta, por ejemplo `utn-helper/build`.
2. Abrí Firefox y navegá a **`about:debugging`** → sección **"This Firefox"** (Este Firefox).
3. Tocá **"Load Temporary Add-on…"** (Cargar complemento temporal).
4. Seleccioná el archivo **`manifest.json`** dentro de la carpeta `build/`.
5. Listo: la extensión aparece en la lista y ya se puede usar.

### Limitaciones

- Se desactiva al **cerrar el navegador**.
- No funciona en **ventanas privadas**.
- Solo para desarrollo/uso personal.

---

## 2. Instalar en Zen Browser

Zen es un fork de Firefox, así que funciona igual que Firefox, apuntando al binario `zen`:

```bash
npx web-ext run --source-dir build \
  --firefox "/Applications/Zen.app/Contents/MacOS/zen"
```

O bien, a mano:

1. Abrí Zen y navegá a **`about:debugging`**.
2. **"Load Temporary Add-on…"** → seleccioná `build/manifest.json`.

Para usar tu perfil normal (con tu login y datos), usá este método manual, no `web-ext run`
(que crea un perfil temporal).

---

## 3. Instalar como extensión firmada (definitiva)

Para una instalación permanente, la extensión debe estar **firmada** por
addons.mozilla.org (AMO). Esto requiere una cuenta de desarrollador.

### Opción A: firma local con `web-ext sign`

```bash
# Requiere credenciales de AMO (API key y secret)
web-ext sign --source-dir build --channel unlisted \
  --api-key TU_API_KEY --api-secret TU_API_SECRET
```

Se genera un archivo `.xpi` firmado. Para instalarlo:

1. Abrí `about:addons`.
2. Tocá la ruedita (engranaje) → **"Install Add-on From File…"** (Instalar complemento desde un archivo).
3. Seleccioná el `.xpi`.

### Opción B: firmar en el sitio de AMO

1. Andá a [addons.mozilla.org](https://addons.mozilla.org/developers/).
2. **"Submit a New Add-on"** → elegí "On my own" (self-distribution, canal *unlisted*).
3. Subí el archivo `utn.ba-helper-vX.Y.Z.zip` generado con `npm run pack`.
4. AMO lo firma y te devuelve el `.xpi` para distribuir/instalar.

> Nota para el mantenedor: para el canal *listed* o *unlisted* se necesita declarar
> `data_collection_permissions` (ya incluido en el manifest) y, en su momento, ajustar la
> descripción de manejo de datos según la review de AMO.

---

## 4. Compilar la extensión desde el código

```bash
git clone https://github.com/rocopolas/utn.ba-helper-firefox.git
cd utn.ba-helper-firefox
npm ci
npm run build     # genera la carpeta build/ con la extensión lista
npm run pack      # (opcional) genera release/utn.ba-helper-vX.Y.Z.zip
npm test          # corre los tests unitarios (jest)
```

Después seguí alguno de los métodos de arriba
(instalación temporal o firma) usando la carpeta `build/`.

---

## 5. Cómo verificar que funciona

1. Iniciá sesión en **`guarani.frba.utn.edu.ar`** con tu cuenta de alumno.
2. En el menú superior debería aparecer **"UTN.BA Helper"** con las secciones:
   - **Buscar Docentes**
   - **Buscar Cursos**
   - **Seguimiento de Plan**
3. En **Horarios** (calendario académico) las materias aparecen con nombre en la grilla.
4. En la pre-inscripción a materias debería mostrarse una tabla con los profesores de cursadas
   anteriores (si el servidor comunitario tiene datos).

---

## 6. Solución de problemas

| Problema | Solución |
|----------|----------|
| La extensión no aparece | Verificá que estés en `about:debugging` → "This Firefox" y que el `manifest.json` sea el de la carpeta `build/`. |
| "No hay resultados disponibles del servidor comunitario" | El backend de `pablomatiasgomez.com.ar` no devolvió datos en ese momento. Las secciones que leen del DOM de Guaraní (Horarios) siguen funcionando. |
| Errores en la consola | Abrí la consola con `Cmd/Ctrl + Alt + K` dentro de Guaraní y revisá el mensaje. |
| Se desactiva al reiniciar | Es una instalación temporal (normal). Para instalación permanente, firmá la extensión (sección 3). |