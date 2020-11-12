import { AnimationQueue } from "./animation.js"
import {boundaryFDEBwithMoveableCenter as BFDEBMC } from "../bundling/boundaryFDEB.js"
import {FDEB as normalFDEB} from "../bundling/FDEB.js"
import { culculate_final_subdivision_num } from "../helper/subfunctions.js"
import { Node, Nodes } from "./node.js"
import { Edge, Edges, AnimationEdges} from "./edge.js"
import { Palette } from "../ui/palette.js"

export class Graph {
  constructor(viewer, palette=new Palette(), state) {
    this.viewer = viewer
    this.scene = viewer.scene;

    this.palette = palette;

    this.state = state;

    this.N = new Nodes();
    this.N_visual = new Nodes();
    this.E = new Edges(this.scene);

    this.E_in = new Edges(this.scene);
    this.E_inout = new Edges(this.scene);
    this.E_out = new Edges(this.scene);

    this.E_inout_curves = undefined;
    this.E_in_curves = undefined;

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
      type        : "GET",
      url         : "../../material/airlines.xml",
      contentType :'application/xml',
      data        : data,
      async       : false,                    // true:非同期(デフォルト), false:同期
      dataType    : "text",                   // これは渡すデータのtypeじゃなくて返り値の型
      success     : function(d) {
        xml_data = xml_parser.parseFromString(d, "application/xml");
      },
      error       : function(XMLHttpRequest, textStatus, errorThrown) {
        console.error(textStatus + ":" + errorThrown);
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
      this.N_visual.push(new Node(x, y, 0.1, id));
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
      if ( this.E[i][0].isIn && this.E[i][this.E[i].length-1].isIn ) {
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
      // this.classifyingEdges();
      // this.unbundle();
    }
    this.AQ.animateQueue();
  }

  autoBundling() {
    if (this.state.AutoBundle) {
      this.executeBundling();
    }
  }
  
  executeBundling() {
    this.classifyingEdges();
    this.continuousBundle();
  }

  bundle() {
    this.unbundle();
    if (this.bundleState) {
      console.error("Graph is already bundled.");
      return;
    }

    const current_viewport = this.viewer.getCurrentViewport();

    this.E_inout.map(edge => {edge.computeBoundaryPoint(current_viewport); return edge});

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
    const final_inout_subdivision_num = culculate_final_subdivision_num(P_initial, P_rate_inout, C);
    const final_in_subdivision_num = culculate_final_subdivision_num(P_initial, P_rate_in, C);

    const E_inout_splited = this.E_inout.createSegmentedEdges(final_inout_subdivision_num);
    const E_in_splited  = this.E_in.createSegmentedEdges(final_in_subdivision_num);

    const E_curves = new BFDEBMC({nodes: this.N, edges: this.E_inout, viewport: current_viewport, initial_viewport: this.viewer.initialViewport, compatibility_threshold: 0.8, P_rate: P_rate_inout}).execute();
    const E_in_curves = new normalFDEB({nodes: this.N, edges: this.E_in, compatibility_threshold: 0.6, P_rate: P_rate_in}).execute();

    this.AE_inout = new AnimationEdges(this.viewer.scene, E_inout_splited, E_curves, 12);
    this.AE_in = new AnimationEdges(this.viewer.scene, E_in_splited, E_in_curves, 12);

    this.viewer.addObject(this.AE_inout.initializeFrameEdges(this.palette.c2));
    this.viewer.addObject(this.AE_in.initializeFrameEdges(this.palette.c4));

    this.AQ.push( [this.E.hiding] );
    this.AQ.push( [this.AE_in.bundling,this.AE_inout.bundling] );

    this.bundleState = true;
  }

  proportional_bundle() {
    if (this.bundleState) {
      console.error("Graph is already bundled.");
      return;
    }

    const current_viewport = this.viewer.getCurrentViewport();

    this.E_inout.map(edge => {edge.computeBoundaryPoint(current_viewport); return edge});

    this.AQ.push( [this.E.hiding] );

    const C = 6;
    const P_rate = 1.1;
    const P_initial = 1;

    const proportion = this.viewer.initialViewport.diagonal / current_viewport.diagonal;
    const current_P_rate = Math.pow( (Math.pow(P_rate,C) * proportion), (1.0/C));

    const final_subdivision_num = culculate_final_subdivision_num(P_initial, current_P_rate, C);

    const E_inout_splited = this.E_inout.createSegmentedEdges(final_subdivision_num);
    const E_in_splited = this.E_in_splited = this.E_in.createSegmentedEdges(final_subdivision_num);

    const E_curves = new BFDEBMC({nodes: this.N, edges: this.E_inout, viewport: current_viewport, initial_viewport: this.viewer.initialViewport, compatibility_threshold: 0.8, P_rate: current_P_rate}).execute();
    const E_in_curves = new normalFDEB({nodes: this.N, edges: this.E_in, compatibility_threshold: 0.6, P_rate: current_P_rate}).execute();

    this.AE_inout = new AnimationEdges(this.viewer.scene, E_inout_splited, E_curves, 12);
    this.AE_in = new AnimationEdges(this.viewer.scene, E_in_splited, E_in_curves, 12);

    this.viewer.addObject(this.AE_inout.initializeFrameEdges(this.palette.c2));
    this.viewer.addObject(this.AE_in.initializeFrameEdges(this.palette.c4));

    this.AQ.push( [this.AE_in.bundling,this.AE_inout.bundling] );

    this.bundleState = true;
  }

  unbundle() {
    console.log("unbundle");
    if (!this.bundleState) {
      return;
    }
    this.AQ.push( [this.AE_in.disposing] )
    this.AQ.push( [this.AE_inout.unbundling] );
    this.AQ.push( [this.E.showing] );
    this.AQ.push( [this.AE_inout.disposing] );

    this.E_in_curves = this.E_in;
    this.E_inout_curves = this.E_inout;
    this.bundleState = false;
  }

  continuousBundle() {

    if (!(this.AE_inout === undefined)) {
      this.AQ.push( [this.AE_in.disposing] )
      this.AQ.push( [this.AE_inout.disposing] );
    }

    const current_viewport = this.viewer.getCurrentViewport();

    this.E_inout.map(edge => {edge.computeBoundaryPoint(current_viewport); return edge});

    let final_inout_subdivision_num, final_in_subdivision_num, P_rate_inout, P_rate_in;
    if (this.state.subdivisionNumber === "fixed") {
      const ALL_SUBDIVISION_NUM = 300 * 64;
      const alpha = this.E_inout.length;
      const beta = this.E_in.length;
      const ratio = 10;
      const inout_subdivision_num = ALL_SUBDIVISION_NUM * (alpha / (alpha + ratio * beta))
      const in_subdivision_num = ALL_SUBDIVISION_NUM * ((ratio * beta) / (alpha + ratio * beta))
      const C = 6;
      const P_initial = 1;
      P_rate_inout = Math.pow(inout_subdivision_num / ((alpha + beta) * P_initial), (1 / C));
      P_rate_in = Math.pow(in_subdivision_num / ((alpha + beta) * P_initial), (1 / C));
      final_inout_subdivision_num = culculate_final_subdivision_num(P_initial, P_rate_inout, C);
      final_in_subdivision_num = culculate_final_subdivision_num(P_initial, P_rate_in, C);
    } else if (this.state.subdivisionNumber === "flexible") {
      const C = 6;
      const P_rate = 1.1;
      const P_initial = 1;
      const proportion = this.viewer.initialViewport.diagonal / current_viewport.diagonal;
      P_rate_inout = P_rate_in = Math.pow( (Math.pow(P_rate,C) * proportion), (1.0/C));
      final_inout_subdivision_num = final_in_subdivision_num = culculate_final_subdivision_num(P_initial, P_rate_inout, C);
    } else if (this.state.subdivisionNumber === "normal") {
      const C = 6;
      const P_initial = 1;
      P_rate_inout = P_rate_in = 2;
      final_inout_subdivision_num = final_in_subdivision_num = culculate_final_subdivision_num(P_initial, P_rate_inout, C);
    } else {
      console.error("Unexpected state : ", this.state.subdivisionNumber);
    }

    let E_inout_splited, E_in_splited;

    if (this.E_inout_curves === undefined && this.E_in_curves === undefined ) {
      E_inout_splited = this.E_inout.createSegmentedEdges(final_inout_subdivision_num);
      E_in_splited = this.E_in.createSegmentedEdges(final_in_subdivision_num);
    } else {
      E_inout_splited = new Edges(this.scece);
      E_in_splited = new Edges(this.scece);
      for (const e_io of this.E_inout) {
        let flag = false;
        for (const c_io of this.E_inout_curves) {
          if (e_io.idx === c_io.idx) {
            E_inout_splited.push(c_io.subdivide(final_inout_subdivision_num));
            flag = true;
            break;
          }
        }

        if (flag) {
          continue;
        }

        for (const c_in of this.E_in_curves) {
          if (e_io.idx === c_in.idx) {
            E_inout_splited.push(c_in.subdivide(final_inout_subdivision_num));
            flag = true;
            break;
          }
        }

        if (flag) {
          continue;
        } else {
          E_inout_splited.push(e_io.subdivide(final_inout_subdivision_num));
        }
      }  

      for (const e_in of this.E_in) {
        let flag = false;
        for (const c_io of this.E_inout_curves) {
          if (e_in.idx === c_io.idx) {
            E_in_splited.push(c_io.subdivide(final_in_subdivision_num));
            flag = true;
            break;
          }
        }

        if (flag) {
          continue;
        }

        for (const c_in of this.E_in_curves) {
          if (e_in.idx === c_in.idx) {
            E_in_splited.push(c_in.subdivide(final_in_subdivision_num));
            flag = true;
            break;
          }
        }

        if (flag) {
          continue;
        } else {
          E_in_splited.push(e_in.subdivide(final_in_subdivision_num));
        }
      }  
    }
    
    console.log(P_rate_inout,final_inout_subdivision_num);
    this.E_inout_curves = new BFDEBMC({nodes: this.N, edges: this.E_inout, viewport: current_viewport, initial_viewport: this.viewer.initialViewport, compatibility_threshold: 0.6, P_rate: P_rate_inout}).execute();
    this.E_in_curves = new normalFDEB({nodes: this.N, edges: this.E_in, compatibility_threshold: 0.6, P_rate: P_rate_in}).execute();
    
    this.AE_inout = new AnimationEdges(this.viewer.scene, E_inout_splited, this.E_inout_curves, 12);
    this.AE_in = new AnimationEdges(this.viewer.scene, E_in_splited, this.E_in_curves, 12);

    this.viewer.addObject(this.AE_inout.initializeFrameEdges(this.palette.c2));
    this.viewer.addObject(this.AE_in.initializeFrameEdges(this.palette.c4));

    this.AQ.push( [this.E.hiding] );
    this.AQ.push( [this.AE_in.bundling,this.AE_inout.bundling] );

    this.bundleState = true;
  }
}






