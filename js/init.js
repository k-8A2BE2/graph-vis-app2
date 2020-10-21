import { Graph } from "./graph_elements/graph.js"
import { Viewer } from "./ui/viewer.js"
import { Palette } from "./ui/palette.js"
import { State } from "./ui/state.js"
window.addEventListener('load', init);

async function init() {
  const viewer = new Viewer();
  const palette = new Palette();
  const state = new State();

  const G = new Graph(viewer, palette, state);

  G.import_xml()
  viewer.addObject(G.N.getNodeObjects());
  viewer.addObject(G.E.getEdgeObjects());

  viewer.addMouseUpEvent(G.autoBundling.bind(G));

  tick();

  function tick() {
    viewer.updateInitialize();
    G.update(viewer);
    viewer.updateFinalize();
    requestAnimationFrame(tick);
  }
}
