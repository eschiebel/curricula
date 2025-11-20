import { describe, it, expect, vi } from "vitest";
import type { Mock } from "vitest";

// Tell Vitest to mock cytoscape (no factory here; it's hoisted)
vi.mock("cytoscape");

import cytoscape from "cytoscape";
import {
	renderCurriculum,
	type Curriculum,
} from "../renderer/renderCurriculum";

// Configure the mock implementation after imports
const cytoscapeMock = cytoscape as unknown as Mock;
cytoscapeMock.mockImplementation((opts: any) => ({
	...opts,
	on: vi.fn(),
}));

describe("renderCurriculum", () => {
	it("calls cytoscape with correct elements and container", () => {
		const container = document.createElement("div");

		const curriculum: Curriculum = {
			curriculumId: "cs-bs-2025",
			name: "B.S. in Computer Science",
			totalCredits: 120,
			semesters: [
				{ id: "fall-1", name: "Fall Year 1", order: 1 },
				{ id: "spring-1", name: "Spring Year 1", order: 2 },
			],
			courses: [
				{
					id: "CS101",
					name: "Intro",
					credits: 3,
					prerequisiteIds: [],
					corequisiteIds: [],
					semesterId: "fall-1",
				},
				{
					id: "CS102",
					name: "Data Structures",
					credits: 3,
					prerequisiteIds: ["CS101"],
					corequisiteIds: [],
					semesterId: "spring-1",
				},
			],
		};

		const setStatus = vi.fn();

		renderCurriculum(curriculum, container, setStatus);

		expect(setStatus).toHaveBeenCalledWith(expect.stringContaining("Loaded"));

		// cytoscape was called with our container and elements
		expect(cytoscapeMock).toHaveBeenCalledTimes(1);
		const args = cytoscapeMock.mock.calls[0][0];

		expect(args.container).toBe(container);
		expect(args.elements.some((e: any) => e.data.id === "CS101")).toBe(true);
		expect(args.elements.some((e: any) => e.data.id === "CS101->CS102")).toBe(
			true,
		);
	});
});
