import {Graph} from "./graph.js"

import {Viewer} from "./viewer.js"

window.addEventListener('load', init);

function init() {
  const viewer = new Viewer();

  const G = new Graph(viewer);

  G.import_xml()
  viewer.addObject(G.N.getNodeObjects());
  viewer.addObject(G.E.getEdgeObjects());

  viewer.addMouseUpEvent(G.bundle.bind(G));

  tick();

  function tick() {
    viewer.updateInitialize();
    G.update(viewer);
    viewer.updateFinalize();
    requestAnimationFrame(tick);
  }
}
