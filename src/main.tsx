import { render } from "preact";
import "./index.css";
import { CurriculumApp } from "./renderer/CurriculumApp";

render(<CurriculumApp />, document.getElementById("app")!);
