import { Graph } from "./graph_elements/graph.js"
import { Viewer } from "./ui/viewer.js"
import { Palette } from "./ui/palette.js"

window.addEventListener('load', init);

async function init() {

    const palette = new Palette();
    await palette.importJSON("/json");

    const viewer = new Viewer(960, 540, palette);

    const G = new Graph(viewer, palette);

    G.import_xml()
    viewer.addObject(G.N.getNodeObjects(palette.c5));
    viewer.addObject(G.E.getEdgeObjects(palette.c2));

    viewer.addMouseUpEvent(G.bundle.bind(G));

    await tick();

    async function tick() {
        viewer.updateInitialize();
        G.update(viewer);
        viewer.updateFinalize();
        requestAnimationFrame(tick);
    }
}
