import { Coordinate } from "./coordinate.js"
import { Animation } from "./animation.js"
import { euclidean_distance, intersection, judge_intersection } from "../helper/subfunctions.js"

export class Edge extends Array {
  constructor(node_list, idx=undefined, src=undefined, tar=undefined) {
    super(...node_list);
    this.segments = node_list.length;
    this.idx = idx; // edge index
    this.src = src; // source node index
    this.tar = tar; // target node index
    this.boundary_point = undefined;
    this.azimath = undefined;
    this.len = euclidean_distance(this[0], this[this.length - 1]);
  }

  get source() {
    return this.src;
  }

  get target() {
    return this.tar;
  }

  set source(src) {
    this.src = src;
  }

  set target(tar) {
    this.tar = tar;
  }

  clone() {
    const coordinateList = [...this];
    return new Edge(coordinateList, this.idx, this.src, this.tar);
  }

  computeBoundaryPoint(viewport) {
    const x1 = this[0].x;
    const y1 = this[0].y;
    const x2 = this[this.length-1].x;
    const y2 = this[this.length-1].y;

    if (judge_intersection(x1, y1, x2, y2, viewport.lower_left.x, viewport.lower_left.y, viewport.upper_left.x, viewport.upper_left.y)) {
      const new_intersection = intersection(x1, y1, x2, y2, viewport.lower_left.x, viewport.lower_left.y, viewport.upper_left.x, viewport.upper_left.y);
      this.boundary_point = new Coordinate(new_intersection[0], new_intersection[1]);
      this.azimath = "W"; // West
    } else if (judge_intersection(x1, y1, x2, y2, viewport.upper_left.x, viewport.upper_left.y, viewport.upper_right.x, viewport.upper_right.y)) {
      const new_intersection = intersection(x1, y1, x2, y2, viewport.upper_left.x, viewport.upper_left.y, viewport.upper_right.x, viewport.upper_right.y);
      this.boundary_point = new Coordinate(new_intersection[0], new_intersection[1]);
      this.azimath = "N"; // North
    } else if (judge_intersection(x1, y1, x2, y2, viewport.upper_right.x, viewport.upper_right.y, viewport.lower_right.x, viewport.lower_right.y)) {
      const new_intersection = intersection(x1, y1, x2, y2, viewport.upper_right.x, viewport.upper_right.y, viewport.lower_right.x, viewport.lower_right.y);
      this.boundary_point = new Coordinate(new_intersection[0], new_intersection[1]);
      this.azimath = "E"; // East
    } else if (judge_intersection(x1, y1, x2, y2, viewport.lower_right.x, viewport.lower_right.y, viewport.lower_left.x, viewport.lower_left.y)) {
      const new_intersection = intersection(x1, y1, x2, y2, viewport.lower_right.x, viewport.lower_right.y, viewport.lower_left.x, viewport.lower_left.y);
      this.boundary_point = new Coordinate(new_intersection[0], new_intersection[1]);
      this.azimath = "S"; // South
    } else {
      console.error("This edge isn't inout edge.", this);
      return false;
    }

    return true;
  }

  switchSourceTarget(viewport) {
    if ( !viewport.isIn(this[0].x, this[0].y) ) {
      this.reverse();
      let foo = this.src;
      this.src = this.tar;
      this.tar = foo;
    }
  }

  attachSegmentPoint(segment) {
    let node_list = [];
    node_list.push(this[0]);
    for (var i = 1; i < segment+1; i++) {
      const x = this[0].x + (this[this.length-1].x - this[0].x) / (segment + 1) * i;
      const y = this[0].y + (this[this.length-1].y - this[0].y) / (segment + 1) * i;
      const z = this[0].z + (this[this.length-1].z - this[0].z) / (segment + 1) * i;
      node_list.push(new Node(x,y,z));
    }
    node_list.push(this[this.length-1]);
    return new Edge(node_list,this.src,this.tar)
  }


}

export class SegmentEdge extends Edge {
  constructor(edge, segment) {
    let coordinate_list = [];
    coordinate_list.push(edge[0]);
    for (let i = 1; i < segment+1; i++) {
      const x = edge[0].x + (edge[edge.length-1].x - edge[0].x) / (segment + 1) * i;
      const y = edge[0].y + (edge[edge.length-1].y - edge[0].y) / (segment + 1) * i;
      const z = edge[0].z + (edge[edge.length-1].z - edge[0].z) / (segment + 1) * i;
      coordinate_list.push(new Coordinate(x,y,z));
    }
    coordinate_list.push(edge[edge.length-1]);
    super(coordinate_list, edge.idx, edge.src, edge.tar);
  }
}

export class Edges extends Array{
  constructor(scene) {
    super();

    this.scene = scene;

    this.indices = [];
    this.size = 0;
    this.segments = 0;
    this.objects = undefined;

    this.MaxOpacity = 0.3;
    this.CurrentOpacity = this.MaxOpacity;
    this.OpacityTick = 0.2;

    this.hiding = new Animation( this.hideAnimation.bind(this), ()=>{}, this.disposeEdgesObject.bind(this) );
    this.showing = new Animation( this.showAnimation.bind(this) );
    // this.disposing = new Animation( this.disposeEdgesObject.bind(this) );
  }

  push(e) {
    super.push(e);
    let idx = this.segments;
    for (var i = 0; i < e.segments-1; i++) {
      this.indices.push(idx,idx+1)
      idx += 1;
    }
    this.size += 1;
    this.segments += e.segments;
  }

  getEdgeObjects(color=0xf5ec9f) {
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.Float32BufferAttribute(this.flat(2), 3));
    this.geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(this.indices), 1));
    this.material = new THREE.LineBasicMaterial({ linewidth: 3, color: color, opacity: this.CurrentOpacity, transparent: true});
    this.objects = new THREE.LineSegments(this.geometry, this.material);
    return this.objects;
  }

  set width(w) {
    this.object.linewidth = w;
  }

  set color(c) {
    this.object.color = c;
  }

  hideAnimation() {
    let animatingFrag = true;
    if ( this.CurrentOpacity <= 0 ) {
      this.CurrentOpacity = 0.0;
      this.objects.material.opacity = this.CurrentOpacity;
      this.objects.visible = false;
      animatingFrag = false;
    } else {
      this.CurrentOpacity -= this.OpacityTick;
      this.objects.material.opacity = this.CurrentOpacity;
    }
    return animatingFrag;
  }

  showAnimation() {
    let animatingFrag = true;
    if ( this.CurrentOpacity >= this.MaxOpacity ) {
      this.CurrentOpacity = this.MaxOpacity;
      this.objects.material.opacity = this.CurrentOpacity;
      animatingFrag = false;
    } else {
      this.objects.visible = true;
      this.CurrentOpacity += this.OpacityTick;
      this.objects.material.opacity = this.CurrentOpacity;
    }
    return animatingFrag;
  }

  disposeEdgesObject() {
    console.log("dispose edges");
    // this.geometry.dispose();
    // this.material.dispose();
    // this.scene.remove(this.objects);
    return false;
  }

  simpleTuple() {
    let tuplelist = [];
    for (var i = 0; i < this.length; i++){
      tuplelist.push([this[i].source, this[i].target]);
    }
    return tuplelist;
  }

  createSegmentedEdges(segmentNum) {
    const segmentedEdges = new Edges();
    for (const edge of this) {
      segmentedEdges.push(new SegmentEdge(edge, segmentNum));
    }
    return segmentedEdges;
  }

}

export class AnimationEdges {
    constructor(scene, originalEdges, bundledEdges, frame=10) {
      this.scene = scene;
  
      this.originalEdges = originalEdges;
      this.bundledEdges = bundledEdges;
  
      this.frame = frame;
      this.currentFrame = 0;
      this.FrameInterval = 1;
      this.CurrentInterval = 1;
  
      this.AnimationEdges = undefined;
      this.AnimationEdgesIndeces = [];
  
      this.FrameEdgesGeometry = undefined;
      this.FrameEdgesMaterial = undefined;
      this.FrameEdgesObject = undefined;
  
      this.completeEdges();
      this.computeIndices();
  
      this.bundling = new Animation( this.bundlingAnimation.bind(this) );
      this.unbundling = new Animation( this.unbundlingAnimation.bind(this) );
      this.disposing = new Animation( this.disposeEdgesObject.bind(this) );
    }
  
    completeEdges() {
      this.AnimationEdges = new Array(this.frame)
      for (var i = 0; i < this.AnimationEdges.length; i++) {
        this.AnimationEdges[i] = new Array();
      }
  
      for (var i = 0; i < this.originalEdges.length; i++) {
        for (var k = 0; k < this.originalEdges[i].length; k++) {
          for (var j = 0; j < this.frame; j++) {
            const x = this.originalEdges[i][k].x + (this.bundledEdges[i][k].x - this.originalEdges[i][k].x) / this.frame * j;
            const y = this.originalEdges[i][k].y + (this.bundledEdges[i][k].y - this.originalEdges[i][k].y) / this.frame * j;
            const z = this.originalEdges[i][k].z + (this.bundledEdges[i][k].z - this.originalEdges[i][k].z) / this.frame * j;
            this.AnimationEdges[j].push(new Coordinate(x,y,z));
          }
        }
      }
    }
  
    computeIndices() {
      for (var i = 0; i < this.originalEdges.length; i++) {
        this.AnimationEdgesIndeces.push(this.originalEdges[0].length * i);
        for (var j = 1; j < this.originalEdges[0].length-1; j++) {
          this.AnimationEdgesIndeces.push(this.originalEdges[0].length * i + j);
          this.AnimationEdgesIndeces.push(this.originalEdges[0].length * i + j);
        }
        this.AnimationEdgesIndeces.push(this.originalEdges[0].length * i + this.originalEdges[0].length - 1);
      }
    }
  
    initializeFrameEdges(color=0xf5ec9f) {
      this.FrameEdgesGeometry = new THREE.BufferGeometry();
      this.FrameEdgesGeometry.setAttribute("position", new THREE.Float32BufferAttribute(this.AnimationEdges[this.currentFrame].flat(), 3));
      this.FrameEdgesGeometry.setIndex(new THREE.BufferAttribute(new Uint16Array(this.AnimationEdgesIndeces), 1));
      this.FrameEdgesMaterial = new THREE.LineBasicMaterial({ linewidth: 3, color: color, opacity: 0.3, transparent: true});
      this.FrameEdgesObject = new THREE.LineSegments(this.FrameEdgesGeometry, this.FrameEdgesMaterial);
      return this.FrameEdgesObject;
    }
  
    bundlingAnimation() {
      let animatingFrag = true;
      if ( this.CurrentInterval == this.FrameInterval ) {
        this.CurrentInterval = 1;
        if ( this.currentFrame == this.frame-1) {
          this.FrameEdgesGeometry.setAttribute("position", new THREE.Float32BufferAttribute(this.AnimationEdges[this.currentFrame].flat(), 3));
          animatingFrag = false;
        } else {
          this.FrameEdgesGeometry.setAttribute("position", new THREE.Float32BufferAttribute(this.AnimationEdges[this.currentFrame].flat(), 3));
          this.currentFrame += 1;
        }
      } else {
        this.CurrentInterval += 1;
      }
      return animatingFrag;
    }
  
    unbundlingAnimation() {
      let animatingFrag = true;
      if ( this.CurrentInterval == this.FrameInterval ) {
        this.CurrentInterval = 1;
        if ( this.currentFrame == 0) {
          this.FrameEdgesGeometry.setAttribute("position", new THREE.Float32BufferAttribute(this.AnimationEdges[this.currentFrame].flat(), 3));
          animatingFrag = false;
        } else {
          this.FrameEdgesGeometry.setAttribute("position", new THREE.Float32BufferAttribute(this.AnimationEdges[this.currentFrame].flat(), 3));
          this.currentFrame -= 1;
        }
      } else {
        this.CurrentInterval += 1;
      }
      return animatingFrag;
    }
  
    disposeEdgesObject() {
      console.log("dispose");
      this.FrameEdgesGeometry.dispose();
      this.FrameEdgesMaterial.dispose();
      this.scene.remove(this.FrameEdgesObject);
      return false;
    }
  }