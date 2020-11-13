import { Coordinate } from "./coordinate.js"

export class Node extends Coordinate{
    constructor(x, y, z=0, id=undefined) {
      super(x,y,z);
      this.id = id;
    }
  
    clone() {
      return new Node(this[0], this[1], this[2], this.id);
    }

    cloneAsCoordinate({x = this[0], y = this[1], z = this[2]}) {
      return new Coordinate(x,y,z);
    }
  }
  
export class Nodes extends Array{
    constructor() {
      super();
      this.objects = undefined;
    }
  
    push(node) {
      super.push(node);
    }
  
    getNodeById(id) {
      return this.find(elem => elem.id == id);
    }
  
    getNodeObjects(color=0xffffff) {
      const sprite = new THREE.TextureLoader().load("texture/node01.png");
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.flat(), 3))
      const material = new THREE.PointsMaterial( { size: 5,
                                                   color: color,
                                                   sizeAttenuation: false,
                                                   map: sprite,
                                                   transparent: true,
                                                   alphaTest: 0.5
                                                 } );
      this.objects = new THREE.Points( geometry, material );
      return this.objects;
    }
  
    set radius(r) {
      this.object.size = r;
    }
  
    set color(c) {
      this.object.color = c;
    }
  
    checkInOut(viewport) {
      for (const n of this) {
        n.isIn = viewport.isIn(n.x, n.y);
      }
    }
}