import {Consts} from './Consts.js';

// El ciclo lectivo arranca a mediados de marzo (la fecha exacta varía por año entre 13/03 y 05/04 según el año)
// La inscripción a materias ocurre justo antes de esta fecha.
const CICLO_LECTIVO_CUTOFF = {month: 2, day: 15};

export function getCicloLectivo(date) {
	let cutoff = new Date(date.getFullYear(), CICLO_LECTIVO_CUTOFF.month, CICLO_LECTIVO_CUTOFF.day);
	return date >= cutoff ? date.getFullYear() : date.getFullYear() - 1;
}

export function getWeightedGrade(date, grade) {
	// La Ordenanza 1549 rige a partir del ciclo lectivo 2017.
	if (getCicloLectivo(date) < 2017) return Consts.WEIGHTED_GRADES[grade];
	return grade;
}
