<h2 align="center">UTN.BA Helper (ex Siga Helper) - Chrome extension</h2>

<p align="center">
	<a href="https://chrome.google.com/webstore/detail/jdgdheoeghamkhfppapjchbojhehimpe"><img src="https://img.shields.io/chrome-web-store/users/jdgdheoeghamkhfppapjchbojhehimpe.svg" alt="downloads"></a>
	<a href="https://chrome.google.com/webstore/detail/jdgdheoeghamkhfppapjchbojhehimpe"><img src="https://img.shields.io/chrome-web-store/rating/jdgdheoeghamkhfppapjchbojhehimpe.svg" alt="rating"></a>
	<a href="https://chrome.google.com/webstore/detail/jdgdheoeghamkhfppapjchbojhehimpe"><img src="https://img.shields.io/chrome-web-store/stars/jdgdheoeghamkhfppapjchbojhehimpe.svg" alt="stars"></a>
</p>
<p align="center"><a href="https://chrome.google.com/webstore/detail/jdgdheoeghamkhfppapjchbojhehimpe"><b>Install from the Chrome Web Store</b></a></p>
<p align="center"><a href="https://chrome.google.com/webstore/detail/jdgdheoeghamkhfppapjchbojhehimpe"><img src="https://img.shields.io/chrome-web-store/v/jdgdheoeghamkhfppapjchbojhehimpe.svg" alt="install"></a></p>
<p align="center"><img src="https://github.com/pablomatiasgomez/utn.ba-helper/raw/master/images/icons/icon128.png" alt="logo"></p>

UTN.BA Helper is an extension (currently available for Chrome) that helps the usage of the UTN.BA web pages.

Features description of this extension are written in Spanish as the target users are from Argentina.

## Features

UTN.BA Helper facilita el uso de la web de la UTN - FRBA.

- Colecta anónimamente distintos datos, para ser utilizados en las distintas secciones, como:
    - Las encuestas docentes para poder publicar esta información en la sección de "Buscar Docentes" e incluso mostrarla al momento de inscribirse a un curso.
    - Los horarios de las cursadas para mostrar esta información al momento de inscribirse a un nuevo curso, y poder intentar predecir cuál va a ser el profesor que va a estar en cada cursada.

- Al momento de inscribirse a materias, muestra los profesores que estuvieron en cada cursada, basándose en data colectada, para así poder saber qué profesor va a estar en cada curso.

- Agrega nuevas secciones bajo el menu "UTN.BA Helper":
    - "Buscar Docentes", donde se puede ver información colectada, entre ello, la encuesta docente.
    - "Buscar Cursos", donde se puede ver información de cursos pasados, como horarios, profesores que estuvieron en cada uno, etc.
    - "Seguimiento de Plan":
        - Se visualiza el estado actual del plan, viendo materias aprobadas, habilitadas para rendir final, por cursar, etc.
        - Peso académico, cantidad de finales aprobados y desaprobados.
        - Promedio de notas ponderadas (según Ordenanza Nº 1549) y no ponderadas, contando y sin contar desaprobados.

- Muestra el numero de legajo en la parte superior de la pagina.

- Agrega el nombre de la materia en la grilla de horarios en la sección de Agenda.

## Screenshots:

<p align="center"><img src="https://github.com/pablomatiasgomez/utn.ba-helper/raw/master/screenshots/BuscarCursos.png" alt="screenshot"></p>

---

<p align="center"><img src="https://github.com/pablomatiasgomez/utn.ba-helper/raw/master/screenshots/BuscarDocentes.png" alt="screenshot"></p>

---

<p align="center"><img src="https://github.com/pablomatiasgomez/utn.ba-helper/raw/master/screenshots/SeguimientoPlan.png" alt="screenshot"></p>

---

<p align="center"><img src="https://github.com/pablomatiasgomez/utn.ba-helper/raw/master/screenshots/PreInscripcion.png" alt="screenshot"></p>

---

<p align="center"><img src="https://github.com/pablomatiasgomez/utn.ba-helper/raw/master/screenshots/Horarios.png" alt="screenshot"></p>

## Glossary

|  English | Spanish     |
|---------:|:------------|
|   Course | Materia     |
|    Class | Cursada     |
| Elective | Optativa    |
|    Grade | Nota        |
|   Signed | Firmada     |
|   Passed | Aprobada    |
|   Failed | Desaprobada |

## Dependencies

### SheetJS

XLS parser is used to parse information from xls documents. The file located at `js/lib/xls.full.min.js` should be
updated using the `full` version of the SheetJS module, which can be downloaded at https://cdn.sheetjs.com/ or directly
from cdnjs at https://cdnjs.com/libraries/xlsx

### PDF.js

PDF.js parser is used to parse information from pdf documents. The files located at `js/lib/pdf.min.js`
and `js/lib/pdf.worker.min.js` should both be updated at the same time with same version, which can be downloaded
from https://mozilla.github.io/pdf.js/getting_started/# or directly from the cdn as a minified
version https://cdnjs.com/libraries/pdf.js

**WARNING**: we are currently using version `2.8.335` and newer versions have been tested but give weird results for the
current class schedules pdf. If decided to upgrade, the PagesDataParser.getClassSchedules function needs to be updated
to handle the new output (empty strings in the middle of the values).