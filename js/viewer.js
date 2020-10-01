import {Viewport} from "./graph.js"

export class Viewer {
    constructor(width=960, height=540) {
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.querySelector('#myCanvas'),
            alpha: true,
            antialias: true,
        });
        this.renderer.setClearColor(0x2e2e2e, 1)
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000);
        this.camera.position.set(0, 0, +1000);

        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.screenSpacePanning = true;
        this.controls.enableRotate = false;

        // this.renderer.domElement,addEventListener("mouseup", this.test ,false)

        this.grid = new THREE.GridHelper(1000,10);
        this.grid.rotation.x = Math.PI/2;
        this.scene.add(this.grid);

        this.initialViewport = this.getCurrentViewport();

        this.previousCameraPosition = this.camera.position.clone();
    }

    test() {
        console.log("test");
    }

    addMouseUpEvent(func) {
        this.renderer.domElement,addEventListener("mouseup", func, false)
    }

    getCurrentViewport() {
        const t = Math.tan( THREE.Math.degToRad( this.camera.fov ) / 2);
        const h = t * 2 * (this.camera.position.z - 0);
        const w = h * this.camera.aspect;
        const max_x = this.camera.position.x + w/2;
        const min_x = this.camera.position.x - w/2;
        const max_y = this.camera.position.y + h/2;
        const min_y = this.camera.position.y - h/2;
        return new Viewport([min_x, min_y, max_x, max_y]);
    }

    addObject(obj) {
        this.scene.add(obj);
    }

    isCameraMove() {
        return !(this.previousCameraPosition.x === this.camera.position.x && this.previousCameraPosition.y === this.camera.position.y && this.previousCameraPosition.z === this.camera.position.z); 
    }

    updateInitialize() {
        this.controls.update();
        this.camera.updateMatrixWorld();
    }

    updateFinalize() {
        this.renderer.render(this.scene, this.camera); 
        this.previousCameraPosition = this.camera.position.clone();
    }
}