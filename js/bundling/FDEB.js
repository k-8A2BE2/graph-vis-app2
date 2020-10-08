import { Edge, Edges } from "../graph_elements/edge.js"
import { Coordinate } from "../graph_elements/coordinate.js"
import { euclidean_distance, project_point_on_line } from "../helper/subfunctions.js"

export class FDEB {
    
    constructor(nodes, edges, viewport, K=0.1, S_initial=0.1, P_initial=1, P_rate=2, C=6,
      I_initial=70, I_rate=0.6666667, compatibility_threshold=0.6, eps=1e-8) {
      this.data_nodes = nodes;
      this.data_edges = this.filter_self_loops(edges);
      this.viewport = viewport;

      this.compatibility_list_for_edge = [];
      this.subdivision_points_for_edge = [];
      this.compatibility_score_list = [];

      this.K = K; // global bundling constant controling edge stiffness
      this.S_initial = S_initial; // init. distance to move points
      this.P_initial = P_initial; // init. subdivision number
      this.P_rate = P_rate; // subdivision rate increase
      this.C = C; // number of cycles to perform
      this.I_initial = I_initial; // init. number of iterations for cycle
      this.I_rate = I_rate; // rate at which iteration number decreases i.e. 2/3
      this.compatibility_threshold = compatibility_threshold;
      this.eps = eps;
    }

    ////////////////////////
    // INITIALIZE METHODS //
    ////////////////////////

    filter_self_loops(edgelist) {
      let filtered_edge_list = [];
      for (let e = 0; e < edgelist.length; e++) {
        if (this.data_nodes[edgelist[e].source].x != this.data_nodes[edgelist[e].target].x &&
          this.data_nodes[edgelist[e].source].y != this.data_nodes[edgelist[e].target].y) {
          filtered_edge_list.push(edgelist[e]);
        }
      }
      return filtered_edge_list;
    }

    initialize_edge_subdivisions() {
      for (let i = 0; i < this.data_edges.length; i++)
      if (this.P_initial == 1)
        this.subdivision_points_for_edge[i] = []; //0 subdivisions
      else {
        this.subdivision_points_for_edge[i] = [];
        this.subdivision_points_for_edge[i].push(this.data_nodes[this.data_edges[i].source]);
        this.subdivision_points_for_edge[i].push(this.data_nodes[this.data_edges[i].target]);
      }
    }

    initialize_compatibility_lists() {
      for (var i = 0; i < this.data_edges.length; i++) {
        this.compatibility_list_for_edge[i] = []; //0 compatible edges.
        this.compatibility_score_list[i] = [];
      }
    }

    initialize_viewport() {
      if (this.viewport) {
        this.lower_left = [this.viewport[0], this.viewport[1]];
        this.upper_left = [this.viewport[0], this.viewport[3]];
        this.upper_right = [this.viewport[2], this.viewport[3]];
        this.lower_right = [this.viewport[2], this.viewport[1]];
      }
    }



    //////////////////////////////////
    // CULCULATE SUBDIVISION METHOD //
    //////////////////////////////////

    culculate_curve_length(idx) {
      let whole_curve_length = 0.0;

      for (let i = 1; i < this.subdivision_points_for_edge[idx].length; i++) {
        const previous_subdivision = this.subdivision_points_for_edge[idx][i-1];
        const current_subdivision = this.subdivision_points_for_edge[idx][i];
        const segment_length = euclidean_distance(previous_subdivision, current_subdivision);
        whole_curve_length += segment_length;
      }
      return whole_curve_length;
    }

    update_edge_divisions(P) {
      let new_subdivision_point_for_edge = [];

      for (var e_idx = 0; e_idx < this.data_edges.length; e_idx++) {
        new_subdivision_point_for_edge.push(this.culculate_edge_division(P, e_idx));
      }
      this.subdivision_points_for_edge = new_subdivision_point_for_edge;
    }

    culculate_edge_division(P, idx) {
        const edge = this.data_edges[idx];
        const source = this.data_nodes[edge.source].clone();
        const target = this.data_nodes[edge.target].clone();
        let new_subdivision_points = [];

        if (P == 1) {
            const mid_point = new Coordinate((source.x + target.x)/2.0, (source.y + target.y)/2.0);
            new_subdivision_points.push(source); // source
            new_subdivision_points.push(mid_point)
            new_subdivision_points.push(target); // target
        } else {
            const whole_curve_length = this.culculate_curve_length(idx);
            const segment_length = whole_curve_length / (P + 1);
            let require_length = segment_length;

            new_subdivision_points.push(source); // source

            for (let i = 1; i < this.subdivision_points_for_edge[idx].length; i++) {
                let old_segment_length = euclidean_distance(this.subdivision_points_for_edge[idx][i-1], this.subdivision_points_for_edge[idx][i]);

                while (old_segment_length > require_length) {
                    const percent_position = require_length / old_segment_length;
                    const new_subdivision = new Coordinate(
                        this.subdivision_points_for_edge[idx][i-1].x + percent_position * (this.subdivision_points_for_edge[idx][i].x - this.subdivision_points_for_edge[idx][i-1].x),
                        this.subdivision_points_for_edge[idx][i-1].y + percent_position * (this.subdivision_points_for_edge[idx][i].y - this.subdivision_points_for_edge[idx][i-1].y)
                    );
                    new_subdivision_points.push(new_subdivision);
                    old_segment_length -= require_length;
                    require_length = segment_length;
                }
                require_length -= old_segment_length;
            }
            new_subdivision_points.push(target);
        }
        return new_subdivision_points;
    }


    ///////////////////////////
    // COMPATIBILITY METHODS //
    ///////////////////////////

    compute_compatibility_lists() {
      for (let p_idx = 0; p_idx < this.data_edges.length - 1; p_idx++) {
        for (let q_idx = p_idx + 1; q_idx < this.data_edges.length; q_idx++) {
          if (p_idx == q_idx) {
            continue;
          } else {
            const P = this.data_edges[p_idx];
            const Q = this.data_edges[q_idx];
            const score = this.compatibility_score(P, Q);
            if (score >= this.compatibility_threshold) {
              this.compatibility_list_for_edge[p_idx].push(q_idx);
              this.compatibility_list_for_edge[q_idx].push(p_idx);
              this.compatibility_score_list[p_idx].push(score);
              this.compatibility_score_list[q_idx].push(score);
            }
          } 
        }
      }
    }

    compatibility_score(P, Q) {
      return this.angle_compatibility(P, Q) * this.scale_compatibility(P, Q) * this.position_compatibility(P, Q) * this.visibility_compatibility(P, Q);
    }

    angle_compatibility(P, Q) {
      const vec1 = new Coordinate(
        this.data_nodes[P.target].x - this.data_nodes[P.source].x,
        this.data_nodes[P.target].y - this.data_nodes[P.source].y 
      );
      const vec2 = new Coordinate(
        this.data_nodes[Q.target].x - this.data_nodes[Q.source].x,
        this.data_nodes[Q.target].y - this.data_nodes[Q.source].y 
      );
        return Math.abs(math.dot(vec1, vec2) / (P.len * Q.len));
    }

    scale_compatibility(P, Q) {
        var lavg = (P.len + Q.len) / 2.0;
        return 2.0 / (lavg / Math.min(P.len,Q.len) + Math.max(P.len, Q.len) / lavg);
    }

    position_compatibility(P, Q) {
      const average_length = (P.len + Q.len) / 2.0;
      const P_middle = new Coordinate(
        (this.data_nodes[P.source].x + this.data_nodes[P.target].x) / 2.0,
        (this.data_nodes[P.source].y + this.data_nodes[P.target].y) / 2.0
      );
      const Q_middle = new Coordinate(
        (this.data_nodes[P.source].x + this.data_nodes[P.target].x) / 2.0,
        (this.data_nodes[Q.source].y + this.data_nodes[Q.target].y) / 2.0
      );
      return average_length / (average_length + euclidean_distance(P_middle, Q_middle));
    }

    edge_visibility(P, Q) {
        const I0 = project_point_on_line(this.data_nodes[Q.source], this.data_nodes[P.source], this.data_nodes[P.target]);
        const I1 = project_point_on_line(this.data_nodes[Q.target], this.data_nodes[P.source], this.data_nodes[P.target]);
        const midI = new Coordinate(
            (I0.x + I1.x) / 2.0,
            (I0.y + I1.y) / 2.0
        );
        const midP = new Coordinate(
            (this.data_nodes[P.source].x + this.data_nodes[P.target].x) / 2.0,
            (this.data_nodes[P.source].y + this.data_nodes[P.target].y) / 2.0
        );
        return Math.max(0, 1 - 2 * euclidean_distance(midP, midI) / euclidean_distance(I0, I1));
    }
    
    visibility_compatibility(P, Q) {
        return Math.min(this.edge_visibility(P, Q), this.edge_visibility(Q, P));
    }




    //////////////////////////////
    // FORCE SIMURATION METHODS //
    //////////////////////////////

    apply_spring_force(e_idx, i, kP) {

      const prev = this.subdivision_points_for_edge[e_idx][i - 1];
      const crnt = this.subdivision_points_for_edge[e_idx][i];
      const next = this.subdivision_points_for_edge[e_idx][i + 1];
  
      let x, y

      try {
        x = prev.x - crnt.x + next.x - crnt.x;
        y = prev.y - crnt.y + next.y - crnt.y;  
      } catch (error) {
        console.error("e_idx",e_idx,"i",i,prev,crnt,next);
        throw "Error"
      }
      
  
      x *= kP;
      y *= kP;
  
      return {'x': x, 'y': y};
    }

    apply_electrostatic_force(e_idx, i) {
      let sum_of_forces = {'x': 0, 'y': 0};
      let compatible_edges_list = this.compatibility_list_for_edge[e_idx];
      window.sbd = this.subdivision_points_for_edge;
  
      for (let oe = 0; oe < compatible_edges_list.length; oe++) {
        const oe_idx = compatible_edges_list[oe];
        const e_subdivision = this.subdivision_points_for_edge[e_idx][i];
        const oe_subdivision = this.subdivision_points_for_edge[oe_idx][i];
  
        const vec = {
          'x': oe_subdivision.x - e_subdivision.x,
          'y': oe_subdivision.y - e_subdivision.y
        };
  
        if ((Math.abs(vec.x) > this.eps) || (Math.abs(vec.y) > this.eps)) {
          const diff = (1 / Math.pow(euclidean_distance(oe_subdivision, e_subdivision), 1));
          sum_of_forces.x += vec.x * diff * this.compatibility_score_list[e_idx][oe];
          sum_of_forces.y += vec.y * diff * this.compatibility_score_list[e_idx][oe];
        }
      }
  
      return sum_of_forces;
    }
  
    apply_resulting_forces_on_subdivision_points(e_idx, P, S) {
      let kP = this.K / (this.data_edges[e_idx].len * (P + 1));
  
      let resulting_forces_for_subdivision_points = [{
        'x': 0,
        'y': 0
      }];
  
      for (var i = 1; i < P + 1; i++) {
        var resulting_force = {
          'x': 0,
          'y': 0
        };
  
        let spring_force = this.apply_spring_force(e_idx, i, kP);
        let electrostatic_force = this.apply_electrostatic_force(e_idx, i);
  
        resulting_force.x = S * (spring_force.x + electrostatic_force.x);
        resulting_force.y = S * (spring_force.y + electrostatic_force.y);
  
        resulting_forces_for_subdivision_points.push(resulting_force);
      }
  
      resulting_forces_for_subdivision_points.push({
        'x': 0,
        'y': 0
      });
  
      return resulting_forces_for_subdivision_points;
    }



    ////////////////////
    // HELPER METHODS //
    ////////////////////

    translaterForThree() {
      const E = new Edges();
      for (var i = 0; i < this.subdivision_points_for_edge.length; i++) {
        let node_list = [];
        node_list.push(this.subdivision_points_for_edge[i][0]);
        for (var j = 1; j < this.subdivision_points_for_edge[i].length-1; j++) {
          let n = new Coordinate(this.subdivision_points_for_edge[i][j].x, this.subdivision_points_for_edge[i][j].y, 0);
          node_list.push(n);
        }
        node_list.push(this.subdivision_points_for_edge[i][this.subdivision_points_for_edge[i].length-1]);
        E.push(new Edge(node_list));
      }
      return E;
    }

    execute() {
        let S = this.S_initial; //
        let I = this.I_initial; //
        let P = this.P_initial; // Pはエッジの内点の数。見掛け上は両端の点で＋2されている。
    
        this.initialize_edge_subdivisions();
        this.initialize_compatibility_lists();
        this.update_edge_divisions(P);
        this.compute_compatibility_lists();
    
        for (var cycle = 0; cycle < this.C; cycle++) {
          for (var iteration = 0; iteration < I; iteration++) {
            var forces = [];
            for (var edge = 0; edge < this.data_edges.length; edge++) {
              forces[edge] = this.apply_resulting_forces_on_subdivision_points(edge, P, S);
            }
            for (var e = 0; e < this.data_edges.length; e++) {
              for (var i = 0; i < P + 1; i++) {
                this.subdivision_points_for_edge[e][i].x += forces[e][i].x;
                this.subdivision_points_for_edge[e][i].y += forces[e][i].y;
              }
            }
          }

          //prepare for next cycle
          S = S / 2;
          P = Math.ceil(P * this.P_rate);
          I = this.I_rate * I;
          console.log("S:",S," P:",P,"I:",I);
          this.update_edge_divisions(P);
        }
        return this.translaterForThree();
    }
}