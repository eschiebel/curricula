import { useEffect, useRef } from "preact/hooks";
import cytoscape from "cytoscape";

type NodeData = {
	id: string;
	label: string;
};

type EdgeData = {
	id: string;
	source: string;
	target: string;
	label?: string;
};

type CytoscapeGraphProps = {
	nodes: NodeData[];
	edges: EdgeData[];
	style?: cytoscape.StylesheetStyle[];
	layout?: cytoscape.LayoutOptions;
	className?: string;
};

export function CytoscapeGraph({
	nodes,
	edges,
	style,
	layout,
	className = "w-full h-[500px] border rounded-md",
}: CytoscapeGraphProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const cyRef = useRef<cytoscape.Core | null>(null);

	useEffect(() => {
		if (!containerRef.current) return;

		// Initialize Cytoscape
		cyRef.current = cytoscape({
			container: containerRef.current,
			elements: {
				nodes: nodes.map((node) => ({
					data: { id: node.id, label: node.label },
				})),
				edges: edges.map((edge) => ({
					data: {
						id: edge.id,
						source: edge.source,
						target: edge.target,
						label: edge.label,
					},
				})),
			},
			style: style || [
				{
					selector: "node",
					style: {
						"background-color": "#3b82f6",
						label: "data(label)",
						"text-valign": "center",
						"text-halign": "center",
						color: "#fff",
						"font-size": "12px",
						width: 40,
						height: 40,
					},
				},
				{
					selector: "edge",
					style: {
						width: 2,
						"line-color": "#9ca3af",
						"target-arrow-color": "#9ca3af",
						"target-arrow-shape": "triangle",
						"curve-style": "bezier",
						label: "data(label)",
						"font-size": "10px",
						"text-rotation": "autorotate",
						"text-margin-y": -10,
					},
				},
			],
			layout: layout || {
				name: "cose", // Force-directed layout
				padding: 50,
				animate: true,
				randomize: true,
				fit: true,
			},
		});

		// Add window resize handler
		const handleResize = () => {
			if (cyRef.current) {
				cyRef.current.resize();
				cyRef.current.fit();
			}
		};

		window.addEventListener("resize", handleResize);

		// Cleanup
		return () => {
			if (cyRef.current) {
				cyRef.current.destroy();
				cyRef.current = null;
			}
			window.removeEventListener("resize", handleResize);
		};
	}, [nodes, edges, style, layout]);

	return <div ref={containerRef} className={className} />;
}

export default CytoscapeGraph;
