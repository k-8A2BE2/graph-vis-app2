import { Graph } from "./graph_elements/graph.js"
import { Viewer, OrthographicViewer } from "./ui/viewer.js"
import { Palette } from "./ui/palette.js"
import { State } from "./ui/state.js"
import { Button, CheckboxWithFunc } from "./ui/uiCompoents.js";

window.addEventListener('load', init);
// const state = new State();

async function init() {

    const palette = new Palette();
    const state = new State();

    await Promise.all([palette.experiment(), state.initialize()])

    // const viewer = new Viewer(960, 540, palette);
    const viewer = new OrthographicViewer(960, 540, palette);
    viewer.initialze();

    const G = new Graph(viewer, palette, state);

    G.import_xml()
    
    viewer.addObject(G.N_visual.getNodeObjects(palette.c5));
    viewer.addObject(G.E.getEdgeObjects(palette.c2));
    viewer.addMouseUpEvent(G.autoBundling.bind(G));

    // const manualBundle = new CheckboxWithFunc("switchManual",G.unbundle.bind(G), G.unbundle.bind(G));
    new Button("buttonBundle", G.executeBundling.bind(G));
    new Button("buttonUnbundle", G.unbundle.bind(G));
    new Button("funcTest", G.testButtonFunction);

    tick();

    function tick() {
        viewer.updateInitialize();
        G.update(viewer);
        viewer.updateFinalize();
        requestAnimationFrame(tick);
        // console.log(viewer.camera.zoom)
    }

    
}
