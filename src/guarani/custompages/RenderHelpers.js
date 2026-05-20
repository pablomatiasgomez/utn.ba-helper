import {Consts} from '../Consts.js';
import {CustomPages} from './CustomPages.js';

export function getSchedulesAsString(schedules) {
	if (!schedules) return "-";
	return schedules
		.map(schedule =>
			Consts.DAYS[schedule.day] + " (" + Consts.TIME_SHIFTS[schedule.shift] + ") " +
			Consts.HOURS[schedule.shift][schedule.firstHour].start + "hs a " + Consts.HOURS[schedule.shift][schedule.lastHour].end + "hs")
		.join(" y ");
}

export function getColorForAvg(avg, alpha = 1) {
	if (avg < 60) {
		return `rgba(213, 28, 38, ${alpha})`; // "#D51C26";
	} else if (avg >= 80) {
		return `rgba(25, 177, 53, ${alpha})`; // "#19B135";
	} else {
		return `rgba(244, 210, 36, ${alpha})`; // "#F4D224";
	}
}

export function getOverallScoreSpan(overallScore) {
	return `<span style="border: 1px solid grey; background-color: ${getColorForAvg(overallScore)}">${overallScore}</span>`;
}

export function getProfessorLi(professor) {
	let fontSize = professor.kind === "DOCENTE" ? "13px" : "11px";
	if (typeof professor.overallScore === "undefined") {
		// If we do not have surveys we do not show the score nor the link.
		return `<li style="font-size: ${fontSize}">${professor.name} (${professor.role})</li>`;
	}
	return `<li style="font-size: ${fontSize}">
		${getOverallScoreSpan(professor.overallScore)}
		<a class="no-ajax" href="${CustomPages.getProfessorSurveyResultsUrl(professor.name)}" target="_blank">${professor.name}</a> (${professor.role})
	</li>`;
}
