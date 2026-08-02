import { renderRefineStage } from './refineStage';
import { demoScene } from './fixtures/demoScene';
import './styles/refine.css';

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (!app) return;
  renderRefineStage(app, demoScene);
});
