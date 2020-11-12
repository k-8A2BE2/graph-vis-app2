import {Viewport} from "../graph_elements/viewport.js"
import { Palette } from "../ui/palette.js"

export class Viewer {
    constructor(width=960, height=540, palette=new Palette()) {
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.querySelector('#myCanvas'),
            alpha: true,
            antialias: true,
        });
        this.width = width
        this.height = height

        this.renderer.setClearColor(palette.c1, 1)
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(width, height);

        this.scene = new THREE.Scene();
    }

    initialze() {
        this.initializeCamera();
        this.initializeController();
        this.initializeGrid();
    }

    initializeCamera() {
        this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 5000);
        this.camera.position.set(0, 0, +1000);
        this.initialViewport = this.getCurrentViewport();
        this.previousCameraPosition = this.camera.position.clone();
    }

    initializeController() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.screenSpacePanning = true;
        this.controls.enableRotate = false;
    }

    initializeGrid() {
        this.grid = new THREE.GridHelper(1000,10);
        this.grid.rotation.x = Math.PI/2;
        this.scene.add(this.grid); 
    }

    addMouseUpEvent(func) {
        this.renderer.domElement.addEventListener("mouseup", func, false)
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
        return !(this.previousCameraPosition.x === this.camera.position.x
                && this.previousCameraPosition.y === this.camera.position.y
                && this.previousCameraPosition.z === this.camera.position.z); 
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

export class OrthographicViewer extends Viewer {
    initializeCamera() {
        this.camera = new THREE.OrthographicCamera(-this.width/2, this.width/2, this.height/2, -this.height/2, 1, 5000);
        this.camera.position.set(0, 0, +1000);
        this.initialViewport = this.getCurrentViewport();
        this.previousCameraPosition = this.camera.position.clone();
    }

    getCurrentViewport() {
        const max_x = this.camera.position.x + (this.width / (2 * this.camera.zoom));
        const min_x = this.camera.position.x - (this.width / (2 * this.camera.zoom));
        const max_y = this.camera.position.y + (this.height / (2 * this.camera.zoom));
        const min_y = this.camera.position.y - (this.height / (2 * this.camera.zoom));
        return new Viewport([min_x, min_y, max_x, max_y]);
    }

    isCameraMove() {
        return !(this.previousCameraPosition.x === this.camera.position.x
                && this.previousCameraPosition.y === this.camera.position.y
                && this.previousCameraPosition.z === this.camera.position.z
                && this.previousCameraZoom === this.camera.zoom); 
    }

    updateFinalize() {
        this.renderer.render(this.scene, this.camera); 
        this.previousCameraPosition = this.camera.position.clone();
        this.previousCameraZoom = this.camera.zoom;
    }
}