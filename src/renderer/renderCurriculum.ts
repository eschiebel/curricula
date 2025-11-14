import dagre from "@dagrejs/dagre";

export interface Course {
	id: string;
	name: string;
	credits: number;
	prerequisiteIds: string[];
	corequisiteIds: string[];
	recommendedSemesterIds?: string[];
}

export interface Semester {
	id: string;
	name: string;
	order: number;
	courseIds: string[];
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
	svg: SVGSVGElement | null,
	setStatus: StatusSetter,
): void {
	if (!svg) return;
	setStatus(`Loaded: ${curriculum.name}`);

	while (svg.firstChild) svg.removeChild(svg.firstChild);

	const g = new dagre.graphlib.Graph({ multigraph: true, directed: true });
	g.setGraph({
		rankdir: "LR",
		nodesep: 40,
		ranksep: 80,
		marginx: 80,
		marginy: 60,
	});
	g.setDefaultEdgeLabel(() => ({}));

	const coursesById = new Map<string, Course>();
	const semesterRankByCourseId = new Map<string, number>();

	for (const sem of curriculum.semesters || []) {
		for (const cid of sem.courseIds || []) {
			if (!semesterRankByCourseId.has(cid)) {
				semesterRankByCourseId.set(cid, sem.order);
			}
		}
	}

	for (const course of curriculum.courses) {
		coursesById.set(course.id, course);
		const label = `${course.id}\n${course.name}\n${course.credits} cr`;
		const width = Math.min(220, 80 + course.name.length * 4);
		const height = 60;
		const nodeData: dagre.Node = { label, width, height } as any;
		const rank = semesterRankByCourseId.get(course.id);
		if (rank != null) {
			(nodeData as any).rank = rank;
		}
		g.setNode(course.id, nodeData);
	}

	for (const course of curriculum.courses) {
		if (Array.isArray(course.prerequisiteIds)) {
			for (const pre of course.prerequisiteIds) {
				if (coursesById.has(pre)) {
					g.setEdge(pre, course.id, { type: "prereq" });
				}
			}
		}
		if (Array.isArray(course.corequisiteIds)) {
			for (const co of course.corequisiteIds) {
				if (coursesById.has(co)) {
					g.setEdge(co, course.id, { type: "coreq" });
				}
			}
		}
	}

	dagre.layout(g);

	const graph = g.graph() as dagre.GraphLabel & {
		width?: number;
		height?: number;
	};
	const baseWidth = graph.width || 800;
	const baseHeight = graph.height || 600;
	svg.setAttribute("viewBox", `0 0 ${baseWidth} ${baseHeight}`);
	svg.setAttribute("width", String(baseWidth));
	svg.setAttribute("height", String(baseHeight));
	(svg as any).dataset.baseWidth = String(baseWidth);
	(svg as any).dataset.baseHeight = String(baseHeight);

	const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
	const markerPrereq = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"marker",
	);
	markerPrereq.setAttribute("id", "arrow-prereq");
	markerPrereq.setAttribute("viewBox", "0 0 10 10");
	markerPrereq.setAttribute("refX", "8");
	markerPrereq.setAttribute("refY", "5");
	markerPrereq.setAttribute("markerWidth", "6");
	markerPrereq.setAttribute("markerHeight", "6");
	markerPrereq.setAttribute("orient", "auto");
	const prereqPath = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"path",
	);
	prereqPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
	prereqPath.setAttribute("fill", "#2c3e50");
	markerPrereq.appendChild(prereqPath);

	const markerCoreq = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"marker",
	);
	markerCoreq.setAttribute("id", "arrow-coreq");
	markerCoreq.setAttribute("viewBox", "0 0 10 10");
	markerCoreq.setAttribute("refX", "8");
	markerCoreq.setAttribute("refY", "5");
	markerCoreq.setAttribute("markerWidth", "6");
	markerCoreq.setAttribute("markerHeight", "6");
	markerCoreq.setAttribute("orient", "auto");
	const coreqPath = document.createElementNS(
		"http://www.w3.org/2000/svg",
		"path",
	);
	coreqPath.setAttribute("d", "M 0 0 L 10 5 L 0 10 z");
	coreqPath.setAttribute("fill", "#8e44ad");
	markerCoreq.appendChild(coreqPath);

	defs.appendChild(markerPrereq);
	defs.appendChild(markerCoreq);
	svg.appendChild(defs);

	g.edges().forEach((e) => {
		const edge: any = g.edge(e);
		const edgeGroup = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"g",
		);
		edgeGroup.classList.add("edge");
		if (edge.type === "coreq") {
			edgeGroup.classList.add("coreq");
		} else {
			edgeGroup.classList.add("prereq");
		}

		const pathEl = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"path",
		);
		const points = edge.points || [];
		if (points.length > 0) {
			let d = `M ${points[0].x} ${points[0].y}`;
			for (let i = 1; i < points.length; i++) {
				const p = points[i];
				d += ` L ${p.x} ${p.y}`;
			}
			pathEl.setAttribute("d", d);
		}
		pathEl.setAttribute(
			"marker-end",
			edge.type === "coreq" ? "url(#arrow-coreq)" : "url(#arrow-prereq)",
		);
		edgeGroup.appendChild(pathEl);
		svg.appendChild(edgeGroup);
	});

	// Compute semester labels in chronological order (by semester.order) and
	// space them evenly across the graph width. This keeps headings readable
	// and in time order, independent of the exact node layout.
	const semestersSorted = [...(curriculum.semesters || [])].sort(
		(a, b) => a.order - b.order,
	);
	const nSemesters = semestersSorted.length || 1;
	semestersSorted.forEach((sem, index) => {
		const x = baseWidth * ((index + 0.5) / nSemesters);
		const label = document.createElementNS(
			"http://www.w3.org/2000/svg",
			"text",
		);
		label.setAttribute("x", String(x));
		label.setAttribute("y", "20");
		label.setAttribute("text-anchor", "middle");
		label.setAttribute("font-size", "12");
		label.setAttribute("fill", "#2c3e50");
		label.setAttribute("font-weight", "600");
		label.textContent = sem.name;
		svg.appendChild(label);
	});

	g.nodes().forEach((v) => {
		const node = g.node(v) as any;
		if (!node) return;
		const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
		group.classList.add("node");

		const x = node.x - node.width / 2;
		const y = node.y - node.height / 2;

		const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
		rect.setAttribute("x", String(x));
		rect.setAttribute("y", String(y));
		rect.setAttribute("width", String(node.width));
		rect.setAttribute("height", String(node.height));
		group.appendChild(rect);

		const lines = String(node.label || "").split("\n");
		const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
		text.setAttribute("x", String(node.x));
		text.setAttribute("y", String(node.y - (lines.length - 1) * 7));
		text.setAttribute("text-anchor", "middle");
		lines.forEach((line, i) => {
			const tspan = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"tspan",
			);
			tspan.setAttribute("x", String(node.x));
			tspan.setAttribute("dy", i === 0 ? "0" : "14");
			tspan.textContent = line;
			text.appendChild(tspan);
		});
		group.appendChild(text);
		svg.appendChild(group);
	});
}
