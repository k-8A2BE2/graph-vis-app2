import { Coordinate } from "./coordinate.js"
import { Animation } from "./animation.js"
import { euclidean_distance, intersection, judge_intersection } from "../helper/subfunctions.js"

export class Edge extends Array {
  constructor(coordinate_list, idx=undefined, src=undefined, tar=undefined, boundary=undefined) {
    super(...coordinate_list);
    this.segments = coordinate_list.length;
    this.idx = idx; // edge index
    this.src = src; // source node index
    this.tar = tar; // target node index
    this.boundary_point = boundary;
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
    return new Edge(coordinateList, this.idx, this.src, this.tar, this.boundary_point);
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
      const foo = this.src;
      this.src = this.tar;
      this.tar = foo;
      return true;
    }
    return false;
    
  }

  attachSegmentPoint(segment) {
    let node_list = [];
    node_list.push(this[0].clone());
    for (var i = 1; i < segment+1; i++) {
      const x = this[0].x + (this[this.length-1].x - this[0].x) / (segment + 1) * i;
      const y = this[0].y + (this[this.length-1].y - this[0].y) / (segment + 1) * i;
      const z = this[0].z + (this[this.length-1].z - this[0].z) / (segment + 1) * i;
      node_list.push(new Node(x,y,z));
    }
    node_list.push(this[this.length-1].clone());
    return new Edge(node_list,this.src,this.tar)
  }

  subdivide(segments) {
    const coordinateList = EdgeFuncs.culculate_edge_division(this, segments);
    return new Edge(coordinateList, this.idx, this.src, this.tar);
  }


}

export class SegmentEdge extends Edge {
  constructor(edge, segment) {
    let coordinate_list = [];
    coordinate_list.push(edge[0].clone());
    for (let i = 1; i < segment+1; i++) {
      const x = edge[0].x + (edge[edge.length-1].x - edge[0].x) / (segment + 1) * i;
      const y = edge[0].y + (edge[edge.length-1].y - edge[0].y) / (segment + 1) * i;
      const z = edge[0].z + (edge[edge.length-1].z - edge[0].z) / (segment + 1) * i;
      coordinate_list.push(new Coordinate(x,y,z));
    }
    coordinate_list.push(edge[edge.length-1].clone());
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
      segmentedEdges.push(edge.subdivide(segmentNum));
    }
    return segmentedEdges;
  }

  clone() {
    const E = new Edges(this.scene);
    for (const edge of this) {
      E.push(edge.clone());
    }
    return E;
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
    }

    static async build(scene, originalEdges, bundledEdges, frame=10) {
      const obj = new AnimationEdges(scene, originalEdges, bundledEdges, frame);
      await obj.completeEdges();
      await obj.computeIndices();
  
      obj.bundling = new Animation( obj.bundlingAnimation.bind(obj) );
      obj.unbundling = new Animation( obj.unbundlingAnimation.bind(obj) );
      obj.disposing = new Animation( obj.disposeEdgesObject.bind(obj) );

      return obj
    }
  
    async completeEdges() {
      this.AnimationEdges = new Array(this.frame)
      for (var i = 0; i < this.frame; i++) {
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
  
    async computeIndices() {
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
      this.FrameEdgesGeometry.dispose();
      this.FrameEdgesMaterial.dispose();
      this.scene.remove(this.FrameEdgesObject);
      return false;
    }
}


class EdgeFuncs {
  static culculate_curve_length(edge) {
    let whole_curve_length = 0.0;
      for (let i = 1; i < edge.length; i++) {
        const previous_subdivision = edge[i-1];
        const current_subdivision = edge[i];
        const segment_length = euclidean_distance(previous_subdivision, current_subdivision);
        whole_curve_length += segment_length;
      }
      return whole_curve_length;
  }

  static culculate_edge_division(edge, segment) {
    const source = edge[0].clone();
    const target = edge[edge.length-1].clone();
    let new_subdivision_points = [];
    const whole_curve_length = EdgeFuncs.culculate_curve_length(edge);
    const segment_length = whole_curve_length / (segment + 1);

    new_subdivision_points.push(source); // source
    for (let i = 1; i < segment+1; i++) {
      const distance = segment_length * i;
      let original_distance = 0.0;
      let j = 1;
      for (; j < edge.length; j++) {
        original_distance += euclidean_distance(edge[j-1], edge[j]);
        if (original_distance > distance) {
          break;
        }
      }
      const vec1 = edge[j-1];
      const vec2 = edge[j];
      const old_segment_length = euclidean_distance(vec1, vec2);
      const q = original_distance - distance;
      const p = old_segment_length - q;
      const percent_position = p / old_segment_length;
      const new_subdivision = new Coordinate(
        vec1.x + (vec2.x - vec1.x) * percent_position,
        vec1.y + (vec2.y - vec1.y) * percent_position
      );
      new_subdivision_points.push(new_subdivision);
    }
    new_subdivision_points.push(target); // target
    return new_subdivision_points;
  }
}