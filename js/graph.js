import { Animation, AnimationQueue } from "./animation.js"
import { euclidean_distance, intersection, judge_intersection } from "./subfunctions.js"
import {boundaryFDEBwithMoveableCenter as BFDEBMC } from "./boundaryFDEB.js"
import {FDEB as normalFDEB} from "./FDEB.js"
import { culculate_final_subdivision_num } from "./subfunctions.js"

export class Graph {
  constructor(viewer) {
    this.viewer = viewer
    this.scene = viewer.scene;

    this.N = new Nodes();
    this.E = new Edges(this.scene);

    this.E_in = new Edges(this.scene);
    this.E_inout = new Edges(this.scene);
    this.E_out = new Edges(this.scene);

    this.AE_inout = undefined;
    this.AE_in = undefined;

    this.AQ = new AnimationQueue();

    this.bundleState = false;
  }

  import_xml() {
    let xml_data;
    const xml_parser = new DOMParser();

    let data = 0;
    $.ajax({
      type        : "POST",
      url         : "/xml",
      contentType :'application/xml',
      data        : data,
      async       : false,                    //true:非同期(デフォルト), false:同期
      dataType    : "text",                 // これは渡すデータのtypeじゃなくて返り値の型
      success     : function(d) {
        console.log("SUCCESS!")
        // console.log(d);
        xml_data = xml_parser.parseFromString(d, "application/xml");
      },
      error       : function(XMLHttpRequest, textStatus, errorThrown) {
        console.log("リクエスト時になんらかのエラーが発生しました\n" + textStatus +":" + errorThrown);
      }
    });

    const raw_nodes = xml_data.getElementsByTagName("node");
    const raw_edges = xml_data.getElementsByTagName("edge");

    let max_x = raw_nodes[0].childNodes[1].textContent-0;
    let min_x = raw_nodes[0].childNodes[1].textContent-0;
    let max_y = raw_nodes[0].childNodes[5].textContent-0;
    let min_y = raw_nodes[0].childNodes[5].textContent-0;

    for (var i = 0; i < raw_nodes.length; i++) {
      const x = raw_nodes[i].childNodes[1].textContent-0;
      const y = (raw_nodes[i].childNodes[5].textContent-0) * (-1);
      const id = raw_nodes[i].getAttribute("id")-0;
      max_x = Math.max(max_x, x);
      min_x = Math.min(min_x, x);
      max_y = Math.max(max_y, y);
      min_y = Math.min(min_y, y);
    }

    const Max_x = 1000;
    const Max_y = 1500;

    for (var i = 0; i < raw_nodes.length; i++) {
      const x = (((raw_nodes[i].childNodes[1].textContent-0) - min_x)/(max_x - min_x) -0.5) * Max_x;
      const y = (((raw_nodes[i].childNodes[5].textContent-0) * (-1) - min_y)/(max_y - min_y) -0.5) * Max_y - 500;
      const id = raw_nodes[i].getAttribute("id")-0;
      this.N.push(new Node(x, y, 0, id));
    }

    for (var i = 0; i < raw_edges.length; i++) {
      const src = raw_edges[i].getAttribute("source")-0;
      const tar = raw_edges[i].getAttribute("target")-0;
      const e = new Edge([this.N[src], this.N[tar]], i, src, tar);
      this.E.push(e);
      this.E_in.push(e.clone());
    }
  }

  classifyingEdges() {
    this.E_in = new Edges(this.scene);
    this.E_inout = new Edges(this.scene);
    this.E_out = new Edges(this.scene);
    for (var i = 0; i < this.E.length; i++) {
      if ( this.E[i][0].isIn && this.E[i][this.E[i].length-1].isIn) {
        this.E_in.push(this.E[i].clone());
      }else if ( !this.E[i][0].isIn && !this.E[i][this.E[i].length-1].isIn ) {
        this.E_out.push(this.E[i].clone());
      } else {
        this.E_inout.push(this.E[i].clone());
      }
    }
  }

  update(viewer) {
    if ( viewer.isCameraMove() ) {
      // this.AQ.push( [this.E_in.hiding] );
      this.N.checkInOut(viewer.getCurrentViewport());
      this.classifyingEdges();
      // AQ.push( [this.E_in.showing] );
      // viewer.addObject(this.E_in.getEdgeObjects());
      this.unbundle();
    }
    this.AQ.animateQueue();
  }

  bundle() {
    if (this.bundleState) {
      console.error("Graph is already bundled.");
      return;
    }

    const current_viewport = this.viewer.getCurrentViewport();

    for (const edge of this.E_inout) {
      edge.computeBoundaryPoint(current_viewport);
    }



    const ALL_SUBDIVISION_NUM = 100 * 64;
    const alpha = this.E_inout.length;
    const beta = this.E_in.length;
    const ratio = 10;
    const inout_subdivision_num = ALL_SUBDIVISION_NUM * (alpha / (alpha + ratio * beta))
    const in_subdivision_num = ALL_SUBDIVISION_NUM * ((ratio * beta) / (alpha + ratio * beta))

    const C = 6;
    const P_initial = 1;
    const P_rate_inout = Math.pow(inout_subdivision_num / ((alpha + beta) * P_initial), (1 / C));
    const P_rate_in = Math.pow(in_subdivision_num / ((alpha + beta) * P_initial), (1 / C));
    const compatibility_threshold = 0.6;
    const final_inout_subdivision_num = culculate_final_subdivision_num(P_initial, P_rate_inout, C);
    const final_in_subdivision_num = culculate_final_subdivision_num(P_initial, P_rate_in, C);

    console.log("P_rate_inout",P_rate_inout,"P_rate_in",P_rate_in);

    const E_inout_splited = new Edges();
    for (var i = 0; i < this.E_inout.length; i++) {
      this.E_inout[i].switchSourceTarget(current_viewport);
      E_inout_splited.push(new SegmentEdge(this.E_inout[i], final_inout_subdivision_num));
    }

    const E_in_splited = new Edges();
    for (let i = 0; i < this.E_in.length; i++) {
      E_in_splited.push(new SegmentEdge(this.E_in[i], final_in_subdivision_num));
    }

    const B = new BFDEBMC(this.N, this.E_inout, current_viewport, this.viewer.initialViewport);
    B.compatibility_threshold = 0.8;
    B.P_rate = P_rate_inout;
    const start1 = performance.now();
    const E_curves = B.execute();
    const end1 = performance.now();

    const B_in = new normalFDEB(this.N, this.E_in);
    B_in.compatibility_threshold = compatibility_threshold;
    B_in.P_rate = P_rate_in;
    const start2 = performance.now();
    const E_in_curves = B_in.execute();
    const end2 = performance.now();

    console.log("inout : ",end1 - start1);
    console.log("in : ",end2 - start2);

    this.AE_inout = new AnimationEdges(this.viewer.scene, E_inout_splited, E_curves, 12);
    this.AE_in = new AnimationEdges(this.viewer.scene, E_in_splited, E_in_curves, 12);

    this.viewer.addObject(this.AE_inout.initializeFrameEdges());
    this.viewer.addObject(this.AE_in.initializeFrameEdges(0xff3e40));

    this.AQ.push( [this.E.hiding] );
    this.AQ.push( [this.AE_in.bundling,this.AE_inout.bundling] );

    this.bundleState = true;
  }


  unbundle() {
    if (!this.bundleState) {
      return;
    }
    this.AQ.push( [this.AE_in.disposing] )
    this.AQ.push( [this.AE_inout.unbundling] );
    this.AQ.push( [this.E.showing] );
    this.AQ.push( [this.AE_inout.disposing] );
    this.bundleState = false;
  }


}

export class Coordinate extends Array{
  constructor(x,y,z=0) {
    super(x,y,z)
  }

  get x() {
    return this[0];
  }

  get y() {
    return this[1];
  }

  get z() {
    return this[2];
  }

  set x(x) {
    this[0] = x;
  }

  set y(y) {
    this[1] = y;
  }

  clone() {
    return new Coordinate(this[0], this[1], this[2]);
  }

  set z(z) {
    this[2] = z;
  }

  DistanceTo(c) {
    return Math.sqrt( Math.pow(c.x-this.x,2) + Math.pow(c.y-this.y,2) + Math.pow(c.z-this.z,2) );
  }
}

export class Node extends Coordinate{
  constructor(x, y, z=0, id=undefined) {
    super(x,y,z);
    this.id = id;
    this.isIn = undefined;
  }

  clone() {
    return new Node(this[0], this[1], this[2], this.id);
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
      if (viewport.isIn(n.x, n.y)) {
        n.isIn = true;
      } else {
        n.isIn = false;
      }
    }
  }
}

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

}

export class Viewport extends Array{

  // input : [x1, y1, x2, y2]

  //  y
  //  ^ upper_left       upper_right
  //  | (x1, y2) ------- (x2, y2)
  //  |     |     center    |
  //  |     |               |
  //  | (x1, y1) ------- (x2, y1)
  //  | lower_left       lower_right
  //  +------------------------------> x

  constructor(viewport) {
    super(...viewport);
    this.lower_left = new Coordinate(this[0], this[1]);
    this.upper_left = new Coordinate(this[0], this[3]);
    this.upper_right = new Coordinate(this[2], this[3]);
    this.lower_right = new Coordinate(this[2], this[1]);
    this.center = new Coordinate((this[0]+this[2])/2.0, (this[1]+this[3])/2.0);
  }

  isIn(x, y) {
    return this[0] <= x && x <= this[2] && this[1] <= y && y <= this[3];
  }

  whichAzimathIntersect(x1, y1, x2, y2) {
    if (judge_intersection(x1, y1, x2, y2, this.lower_left.x, this.lower_left.y, this.upper_left.x, this.upper_left.y)) {
      return "W";
    } else if (judge_intersection(x1, y1, x2, y2, this.upper_left.x, this.upper_left.y, this.upper_right.x, this.upper_right.y)) {
      return "N";
    } else if (judge_intersection(x1, y1, x2, y2, this.upper_right.x, this.upper_right.y, this.lower_right.x, this.lower_right.y)) {
      return "E";
    } else if (judge_intersection(x1, y1, x2, y2, this.lower_right.x, this.lower_right.y, this.lower_left.x, this.lower_left.y)) {
      return "S";
    } else {
      return false;
    }
  }

  intersectionWithWest(x1, y1, x2, y2) {
    const new_intersection = intersection(x1, y1, x2, y2, this.lower_left.x, this.lower_left.y, this.upper_left.x, this.upper_left.y)
    return new Coordinate(new_intersection[0], new_intersection[1]);
  }

  intersectionWithNorth(x1, y1, x2, y2) {
    const new_intersection = intersection(x1, y1, x2, y2, this.upper_left.x, this.upper_left.y, this.upper_right.x, this.upper_right.y);
    return new Coordinate(new_intersection[0], new_intersection[1]);
  }

  intersectionWithEast(x1, y1, x2, y2) {
    const new_intersection = intersection(x1, y1, x2, y2, this.upper_right.x, this.upper_right.y, this.lower_right.x, this.lower_right.y);
    return new Coordinate(new_intersection[0], new_intersection[1]);
  }

  intersectionWithSouth(x1, y1, x2, y2) {
    const new_intersection = intersection(x1, y1, x2, y2, this.lower_right.x, this.lower_right.y, this.lower_left.x, this.lower_left.y);
    return new Coordinate(new_intersection[0], new_intersection[1]);
  }

  intersectionWithViewport(x1, y1, x2, y2, azimath) {
    if (azimath == "W") {
      return this.intersectionWithWest(x1, y1, x2, y2);
    } else if (azimath == "N") {
      return this.intersectionWithNorth(x1, y1, x2, y2);
    } else if (azimath == "E") {
      return this.intersectionWithEast(x1, y1, x2, y2);
    } else if (azimath == "S") {
      return this.intersectionWithSouth(x1, y1, x2, y2);
    } else {
      throw "Error: unexpected azimath."
    }
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
