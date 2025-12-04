import { render } from 'preact'
import './index.css'
import { CurriculumApp } from './renderer/CurriculumApp'

const appElement = document.getElementById('app')
if (appElement) {
  render(<CurriculumApp />, appElement)
} else {
  console.error('Element with ID "app" not found.')
}
