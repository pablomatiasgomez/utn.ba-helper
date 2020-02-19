<h2 align="center">Siga Helper - Chrome extension</h2>

<p align="center">
	<a href="https://chrome.google.com/webstore/detail/siga-helper/jdgdheoeghamkhfppapjchbojhehimpe"><img src="https://img.shields.io/chrome-web-store/users/jdgdheoeghamkhfppapjchbojhehimpe.svg" alt="downloads"></a>
	<a href="https://chrome.google.com/webstore/detail/siga-helper/jdgdheoeghamkhfppapjchbojhehimpe"><img src="https://img.shields.io/chrome-web-store/rating/jdgdheoeghamkhfppapjchbojhehimpe.svg" alt="rating"></a>
	<a href="https://chrome.google.com/webstore/detail/siga-helper/jdgdheoeghamkhfppapjchbojhehimpe"><img src="https://img.shields.io/chrome-web-store/stars/jdgdheoeghamkhfppapjchbojhehimpe.svg" alt="stars"></a>
</p>
<p align="center"><a href="https://chrome.google.com/webstore/detail/siga-helper/jdgdheoeghamkhfppapjchbojhehimpe"><b>Install from the Chrome webstore</b></a></p>
<p align="center"><a href="https://chrome.google.com/webstore/detail/siga-helper/jdgdheoeghamkhfppapjchbojhehimpe"><img src="https://img.shields.io/chrome-web-store/v/jdgdheoeghamkhfppapjchbojhehimpe.svg" alt="install"></a></p>
<p align="center"><img src="https://github.com/pablomatiasgomez/siga-helper-chrome/blob/master/images/icons/icon128.png" alt="logo"></p>


# Siga Helper Extension - Chrome Version

Extensión para Chrome que agrega una serie de features sobre el <a href="http://siga.frba.utn.edu.ar/">SIGA de la UTN - FRBA</a>.

## Features

- En la sección de "Actas de finales", calcula y muestra:
    - Nota ponderada para cada final, si corresponde, según Ordenanza Nº 1549.
    - Peso académico
    - Promedio de finales aprobados.
    - Promedio de finales incluyendo desaprobados.
    - Cantidad de materias aprobadas.
    - Cantidad de materias desaprobadas.

- En la sección de "Horarios de cursada", calcula y muestra:
    - Nombre de la materia en la grilla de horarios.
    - Horario de cursada con detalle explícito. Ej: "Ma(n)1:3 Ju(n)1:5" -> "Martes (Noche) 19:00hs a 21:30hs y Jueves (Noche) 19:00hs a 23:00hs".

- En la sección de "Pre inscripción a cursos", calcula y muestra:
    - Grilla con el preview de las alternativas de cursadas seleccionadas.
    - Filtros en el popup de inscripción de cursos por día/turno/sede.
    - Horario de cursada con detalle explícito en el popup de inscripción de cursos. Ej: "Ma(n)1:3 Ju(n)1:5" -> "Martes (Noche) 19:00hs a 21:30hs y Jueves (Noche) 19:00hs a 23:00hs".
    - Profesores que estuvieron en cada cursada, basandose en data colectada.

- Colecta anonimamente distintos datos, como:
    - Las encuestas docentes para poder publicar esta información en la seccion de "Buscar Docentes" e incluso mostrarla al momento de inscribirse a un curso.
    - Los horarios de las cursadas para mostrar esta informacion al momento de inscribirse a un nuevo curso, y poder intentar predecir cual va a ser el profesor que va a estar en cada cursada.

- Agrega nuevas secciones:
    - "Buscar Docentes", donde se puede ver information colectada, entre ello, la encuesta docente.
    - "Buscar Cursos", donde se puede ver information de cursos pasados, como horarios, profesores que estuvieron en cada uno, etc.


## Screenshots:

<p align="center"><img src="https://github.com/pablomatiasgomez/siga-helper-chrome/blob/master/prints/ActasDeFinales.jpg" alt="screenshot"></p>
<p align="center"><img src="https://github.com/pablomatiasgomez/siga-helper-chrome/blob/master/prints/PreInscripcion.png" alt="screenshot"></p>
<p align="center"><img src="https://github.com/pablomatiasgomez/siga-helper-chrome/blob/master/prints/Horarios.png" alt="screenshot"></p>

## TODO list

* Mostrar el nombre de materias anuales en el preview de cursada al momento de inscribirse.
* En la encuesta docente dividir preguntas docente de auxiliares.
* En la encuesta docente mostrar en que cursos estuvo ese profesor.

## Glossary

| English | Spanish |
| --- | --- |
| Course | Materia |
| Class | Cursada |
| Grade | Nota |
| Signed | Firmada |
| Passed | Aprobada |
| Failed | Desaprobada |
