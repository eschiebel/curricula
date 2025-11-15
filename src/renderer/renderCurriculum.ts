import cytoscape from "cytoscape";

export interface Course {
	id: string;
	name: string;
	credits: number;
	prerequisiteIds: string[];
	corequisiteIds: string[];
	/** Primary semester this course belongs to. */
	semesterId: string;
}

export interface Semester {
	id: string;
	name: string;
	order: number;
}

export interface Curriculum {
	curriculumId: string;
	name: string;
	totalCredits: number;
	semesters: Semester[];
	courses: Course[];
}

export type StatusSetter = (text: string, isError?: boolean) => void;

export function renderCurriculum(
	curriculum: Curriculum,
	container: HTMLElement | null,
	setStatus: StatusSetter,
): void {
	if (!container) return;
	setStatus(`Loaded: ${curriculum.name}`);

	while (container.firstChild) container.removeChild(container.firstChild);

	const semestersSorted = [...(curriculum.semesters || [])].sort(
		(a, b) => a.order - b.order,
	);
	const columnMap: Record<string, number> = {};
	semestersSorted.forEach((sem, i) => {
		columnMap[sem.id] = i * 300; // spacing between semester columns
	});

	const semesterIndex: Record<string, number> = {};
	const elements: any[] = [];

	// Add a header node at the top of each semester column
	for (const sem of semestersSorted) {
		const x = columnMap[sem.id] ?? 0;
		const y = 0;
		elements.push({
			data: {
				id: `semester:${sem.id}`,
				label: sem.name,
				semester: sem.id,
				type: "semester-header",
			},
			position: { x, y },
			grabbable: false,
			selectable: false,
		});
	}

	for (const course of curriculum.courses) {
		if (semesterIndex[course.semesterId] == null) {
			semesterIndex[course.semesterId] = 0;
		}

		const idx = semesterIndex[course.semesterId]++;
		const x = columnMap[course.semesterId] ?? 0;
		const y = 120 + idx * 120; // vertical spacing between courses within a semester, offset below header

		elements.push({
			data: {
				id: course.id,
				label: `${course.id}\n${course.name}\n${course.credits} cr`,
				semester: course.semesterId,
			},
			position: { x, y },
		});
	}

	for (const course of curriculum.courses) {
		if (Array.isArray(course.prerequisiteIds)) {
			for (const prereq of course.prerequisiteIds) {
				if (!prereq) continue;
				elements.push({
					data: {
						id: `${prereq}->${course.id}`,
						source: prereq,
						target: course.id,
					},
				});
			}
		}
		if (Array.isArray(course.corequisiteIds)) {
			for (const coreq of course.corequisiteIds) {
				if (!coreq) continue;
				elements.push({
					data: {
						id: `coreq:${coreq}->${course.id}`,
						source: coreq,
						target: course.id,
						type: "coreq",
					},
				});
			}
		}
	}

	cytoscape({
		container,
		elements,
		style: [
			{
				selector: "node",
				style: {
					label: "data(label)",
					"text-valign": "center",
					"text-wrap": "wrap",
					"text-max-width": "200px",
					color: "#000",
					"background-color": "#ecf0f1",
					"border-color": "#34495e",
					"border-width": 1.5,
					shape: "round-rectangle",
					width: 220,
					height: 80,
				},
			},
			{
				selector: 'node[type = "semester-header"]',
				style: {
					"background-color": "#ffffff",
					"border-color": "#ffffff",
					"font-weight": "bold",
					"text-valign": "center",
					"text-halign": "center",
					"font-size": "24px",
					width: 220,
					height: 40,
				},
			},
			{
				selector: "edge",
				style: {
					width: 2,
					"line-color": "#2c3e50",
					"curve-style": "segments",
					// these two control the orthogonal bend;
					// tweak values to taste
					"segment-distances": 40,
					"segment-weights": 0.5,
					"target-arrow-color": "#2c3e50",
					"target-arrow-shape": "triangle",
					"arrow-scale": 1.2,
				},
			},
			{
				selector: 'edge[type = "coreq"]',
				style: {
					"line-style": "dashed",
					"line-color": "#8e44ad",
					"curve-style": "segments",
					"segment-distances": 40,
					"segment-weights": 0.5,
					"target-arrow-color": "#8e44ad",
					"target-arrow-shape": "triangle",
				},
			},
		],
		layout: {
			name: "preset",
		},
	});
}
