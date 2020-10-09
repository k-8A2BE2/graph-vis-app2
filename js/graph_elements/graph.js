import { Animation, AnimationQueue } from "./animation.js"
import { euclidean_distance, intersection, judge_intersection } from "../helper/subfunctions.js"
import {boundaryFDEBwithMoveableCenter as BFDEBMC } from "../bundling/boundaryFDEB.js"
import {FDEB as normalFDEB} from "../bundling/FDEB.js"
import { culculate_final_subdivision_num } from "../helper/subfunctions.js"
import { Coordinate } from "./coordinate.js"
import { Node, Nodes } from "./node.js"
import { Edge, SegmentEdge, Edges, AnimationEdges} from "./edge.js"
import { Viewport } from "./viewport.js"
import { Palette } from "../ui/palette.js"

export class Graph {
  constructor(viewer,palette= new Palette()) {
    this.viewer = viewer
    this.scene = viewer.scene;

    this.palette = palette;

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
      this.N.checkInOut(viewer.getCurrentViewport());
      this.classifyingEdges();
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

    this.AQ.push( [this.E.hiding] );

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
    const E_curves = B.execute();

    const B_in = new normalFDEB(this.N, this.E_in);
    B_in.compatibility_threshold = compatibility_threshold;
    B_in.P_rate = P_rate_in;
    const E_in_curves = B_in.execute();

    this.AE_inout = new AnimationEdges(this.viewer.scene, E_inout_splited, E_curves, 12);
    this.AE_in = new AnimationEdges(this.viewer.scene, E_in_splited, E_in_curves, 12);

    this.viewer.addObject(this.AE_inout.initializeFrameEdges(this.palette.c2));
    this.viewer.addObject(this.AE_in.initializeFrameEdges(this.palette.c4));

    // this.AQ.push( [this.E.hiding] );
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





