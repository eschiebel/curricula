import React, {
	useEffect,
	useRef,
	useState,
	ChangeEvent,
	useCallback,
} from "react";
import fs from "fs";
import path from "path";
import { Curriculum, renderCurriculum } from "./renderCurriculum";

export function CurriculumApp() {
	const svgRef = useRef<SVGSVGElement | null>(null);
	const [status, setStatusState] = useState<string>("No file loaded.");
	const [statusError, setStatusError] = useState<boolean>(false);
	const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
	const [zoom, setZoom] = useState<number>(1);

	const setStatus = useCallback((text: string, isError = false) => {
		setStatusState(text);
		setStatusError(!!isError);
	}, []);

	useEffect(() => {
		if (curriculum) {
			renderCurriculum(curriculum, svgRef.current, setStatus);
		}
	}, [curriculum, setStatus]);

	useEffect(() => {
		const svg = svgRef.current;
		if (!svg) return;
		const baseWidth = Number(svg.dataset.baseWidth || "800");
		const baseHeight = Number(svg.dataset.baseHeight || "600");
		const zoomFactor = zoom;
		svg.style.transform = "";
		svg.setAttribute("width", String(baseWidth * zoomFactor));
		svg.setAttribute("height", String(baseHeight * zoomFactor));
	}, [zoom]);

	const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
		const input = event.target;
		if (!input.files || input.files.length === 0) return;
		const file = input.files[0];
		const reader = new FileReader();
		reader.onload = () => {
			try {
				const json = JSON.parse(String(reader.result));
				setCurriculum(json);
			} catch (err) {
				console.error(err);
				setStatus("Failed to parse selected file as JSON", true);
			}
		};
		reader.readAsText(file);
	};

	const loadCurriculumFromPath = (relativePath: string) => {
		try {
			// When compiled, this file lives in dist/renderer, while JSON files live in ../data.
			const fullPath = path.resolve(
				__dirname,
				"..",
				"..",
				"data",
				relativePath,
			);
			const contents = fs.readFileSync(fullPath, "utf-8");
			const json = JSON.parse(contents);
			setCurriculum(json);
		} catch (err) {
			console.error("Failed to load curriculum from", relativePath, err);
			setStatus("Failed to load " + relativePath, true);
		}
	};

	const zoomIn = useCallback(() => {
		setZoom((z) => Math.min(3, z + 0.1));
	}, []);

	const zoomOut = useCallback(() => {
		setZoom((z) => Math.max(0.2, z - 0.1));
	}, []);

	return (
		<div className="app-shell">
			<div className="top-bar">
				<h1>Curriculum Visualizer</h1>
				<div className="controls">
					<label htmlFor="file-input">Load curriculum JSON:</label>
					<input
						id="file-input"
						type="file"
						accept="application/json,.json"
						onChange={handleFileChange}
					/>
					<button
						className="secondary"
						type="button"
						onClick={() => loadCurriculumFromPath("sample.json")}
					>
						Load sample.json
					</button>
					<button
						className="secondary"
						type="button"
						onClick={() => loadCurriculumFromPath("bs-me.json")}
					>
						Load bs-me.json
					</button>
					<button type="button" onClick={zoomOut}>
						-
					</button>
					<button type="button" onClick={zoomIn}>
						+
					</button>
					<span className={`status-text${statusError ? " error" : ""}`}>
						{status}
					</span>
				</div>
				<div className="legend">
					<span className="legend-item">
						<span className="legend-line" />
						Prerequisite
					</span>
					<span className="legend-item">
						<span className="legend-line coreq" />
						Corequisite
					</span>
				</div>
			</div>
			<div className="graph-container">
				<svg id="graph-svg" ref={svgRef} />
			</div>
		</div>
	);
}
