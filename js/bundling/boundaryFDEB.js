import {Edge, Edges} from "../graph_elements/edge.js"
import { Coordinate } from "../graph_elements/coordinate.js"
import { euclidean_distance } from "../helper/subfunctions.js"

export class boundaryFDEB {
    
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
      const edge = this.data_edges[idx];

      let whole_curve_length = 0.0;
      let curve_length_to_border = 0.0;

      for (let i = 1; i < this.subdivision_points_for_edge[idx].length; i++) {
        const previous_subdivision = this.subdivision_points_for_edge[idx][i-1];
        const current_subdivision = this.subdivision_points_for_edge[idx][i];
        const segment_length = euclidean_distance(previous_subdivision, current_subdivision);

        if (this.viewport.isIn(current_subdivision.x, current_subdivision.y) ^ this.viewport.isIn(previous_subdivision.x, previous_subdivision.y))  {
          const azimath = this.viewport.whichAzimathIntersect(previous_subdivision.x, previous_subdivision.y, current_subdivision.x, current_subdivision.y);
          const segment_boundary = this.viewport.intersectionWithViewport(previous_subdivision.x, previous_subdivision.y, current_subdivision.x, current_subdivision.y, azimath);
          curve_length_to_border = whole_curve_length + euclidean_distance(previous_subdivision, segment_boundary);
        }

        whole_curve_length += segment_length;
      }
      return [whole_curve_length, curve_length_to_border];
    }

    update_edge_divisions(P, ratio=0.5) {
      let new_subdivision_point_for_edge = [];

      for (var e_idx = 0; e_idx < this.data_edges.length; e_idx++) {
        new_subdivision_point_for_edge.push(this.culculate_edge_division(P, e_idx, ratio));
      }

      this.subdivision_points_for_edge = new_subdivision_point_for_edge;

    }

    culculate_edge_division(P, idx, ratio) {
      const edge = this.data_edges[idx];
      const source = this.data_nodes[edge.source].clone();
      const target = this.data_nodes[edge.target].clone();
      const boundary_point = edge.boundary_point.clone();
      let new_subdivision_points = [];

      if (P == 1) {
        new_subdivision_points.push(source); // source
        new_subdivision_points.push(boundary_point); // mid point
        new_subdivision_points.push(target); // target
      } else {
        new_subdivision_points.push(source);
        
        const segment_num = P + 1; 
        const middle_idx = Math.round(P * ratio);
        const buf = this.culculate_curve_length(idx);
        const whole_curve_length = buf[0];     // length of curve edge
        const curve_length_to_border = buf[1]; // length from source to boundary point
        const curve_length_from_border = buf[0] - buf[1];

        let previous_buffer_subdivision = this.subdivision_points_for_edge[idx][0];
        let current_buffer_subdivision = this.subdivision_points_for_edge[idx][1]; 

        let original_idx = 1;
        let segment_length = curve_length_to_border / middle_idx;

        for (let segment_idx = 1; segment_idx < segment_num; segment_idx++) {
          
          if (segment_idx == middle_idx + 1) {
            segment_length = curve_length_from_border / (segment_num - middle_idx);
          }

          let require_length = segment_length;

          while (require_length != 0) {

            let previous_segment_length = euclidean_distance(previous_buffer_subdivision, current_buffer_subdivision); 

            if (previous_segment_length > require_length) {
              const length_ratio = require_length / previous_segment_length;
              const new_subdivision = new Coordinate(
                previous_buffer_subdivision.x + (current_buffer_subdivision.x - previous_buffer_subdivision.x) * length_ratio,
                previous_buffer_subdivision.y + (current_buffer_subdivision.y - previous_buffer_subdivision.y) * length_ratio
              );
              new_subdivision_points.push(new_subdivision);
              previous_buffer_subdivision = new_subdivision;
              require_length -= require_length;
            } else {
              require_length -= previous_segment_length;

              if (require_length == 0 ) {
                const new_subdivision = new Coordinate(
                  current_buffer_subdivision.x,
                  current_buffer_subdivision.y
                );
                new_subdivision_points.push(new_subdivision);
                previous_buffer_subdivision = new_subdivision;
                original_idx += 1;
                current_buffer_subdivision = this.subdivision_points_for_edge[idx][original_idx];
                break;
              } else {
                previous_buffer_subdivision = current_buffer_subdivision;
                original_idx += 1;
                current_buffer_subdivision = this.subdivision_points_for_edge[idx][original_idx];
              }
            }
          }
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

    are_compatible(P, Q) {
      return (this.compatibility_score(P, Q) >= this.compatibility_threshold);
    }

    compatibility_score(P, Q) {
      // console.log("afcc",this.angle_from_center_compatibility(P, Q),"cac",this.center_angle_compatibility(P, Q));
      return this.center_angle_compatibility(P, Q) * this.distance_from_center_compatibility(P, Q) * this.position_compatibility(P, Q); // legacy
      // return this.angle_from_center_compatibility(P, Q) * this.distance_from_center_compatibility(P, Q) * this.position_compatibility(P, Q); //modern
    }

    far_node_of_edge(e) {
      try {
        euclidean_distance(this.viewport.center, this.data_nodes[e.source])
      } catch (error) {
        console.error("e",this.viewport.center,this.data_nodes[e.source]);
      }
      
      if (euclidean_distance(this.viewport.center, this.data_nodes[e.source]) > euclidean_distance(this.viewport.center, this.data_nodes[e.target])) {
        return e.source;
      } else {
        return e.target;
      }
    }

    angle_from_center(n) {
      let x = n.x - this.viewport.center.x;
      let y = n.y - this.viewport.center.y;
      let r = Math.atan2(y, x);
      return r + Math.PI;
    }

    center_angle_compatibility(P, Q) {
      let pca = this.angle_from_center(this.data_nodes[this.far_node_of_edge(P)]);
      let qca = this.angle_from_center(this.data_nodes[this.far_node_of_edge(Q)]);
      let r = Math.abs(pca - qca)
      if (2 * Math.PI - r < r) {
        r = 2 * Math.PI - r;
      }
      // return (2 * Math.PI - r ) / (2 * Math.PI);
      return Math.cos(r);
    }


    angle_from_center_compatibility(P, Q) {
      const P_target = this.data_nodes[P.target];
      const Q_target = this.data_nodes[Q.target];
      const center = this.viewport.center;
      const vec1 = new Coordinate(
        P_target.x - center.x,
        P_target.y - center.y
      );
      const vec2 = new Coordinate(
        Q_target.x - center.x,
        Q_target.y - center.y
      );

      return Math.abs(math.dot(vec1, vec2) / (euclidean_distance(P_target, center) * euclidean_distance(Q_target, center)));
    }

    distance_from_center_compatibility(P, Q) {
      const P_target = this.data_nodes[P.target];
      const Q_target = this.data_nodes[Q.target];
      const center = this.viewport.center;
      const P_distance = euclidean_distance(P_target, center);
      const Q_distance = euclidean_distance(Q_target, center);
      const average_distance = (P_distance + Q_distance) / 2.0;
      return 2.0 / (average_distance / Math.min(P_distance, Q_distance) + Math.max(P_distance, Q_distance) / average_distance); 
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

    translaterForThree(spfe) {

      const E = new Edges();
      for (var i = 0; i < spfe.length; i++) {
        let node_list = [];
        node_list.push(spfe[i][0]);
        for (var j = 1; j < spfe[i].length-1; j++) {
          let n = new Coordinate(spfe[i][j].x, spfe[i][j].y, 0);
          node_list.push(n);
        }
        node_list.push(spfe[i][spfe[i].length-1]);
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
          P = (Math.ceil(P * this.P_rate) == P ? P + 1 : Math.ceil(P * this.P_rate));
          I = this.I_rate * I;
    
          console.log("S:",S," P:",P,"I:",I);

          this.update_edge_divisions(P);
        }

        return this.translaterForThree(this.subdivision_points_for_edge);
      }
}


export class boundaryFDEBwithMoveableCenter extends boundaryFDEB {
  constructor(nodes, edges, viewport, initial_viewport, K=0.1, S_initial=0.1, P_initial=1, P_rate=2, C=6,
    I_initial=70, I_rate=0.6666667, compatibility_threshold=0.6, eps=1e-8) {
    super(nodes, edges, viewport, K, S_initial, P_initial, P_rate, C, I_initial, I_rate, compatibility_threshold, eps);
    this.initial_viewport = initial_viewport;
    this.viewport_ratio = euclidean_distance(this.viewport.lower_left, this.viewport.upper_right) / euclidean_distance(this.initial_viewport.lower_left, this.initial_viewport.upper_right);
  }

  culcurate_float_center(src) {
    return new Coordinate(
      this.viewport.center.x + this.viewport_ratio * (src.x - this.viewport.center.x),
      this.viewport.center.y + this.viewport_ratio * (src.y - this.viewport.center.y)
    );
  }

  angle_from_center_compatibility(P, Q) {
    const P_source = this.data_nodes[P.source];
    const P_target = this.data_nodes[P.target];
    const Q_source = this.data_nodes[Q.source];
    const Q_target = this.data_nodes[Q.target];
    const P_float_center = this.culcurate_float_center(P_source);
    const Q_float_center = this.culcurate_float_center(Q_source);
    const vec1 = new Coordinate(
        P_target.x - P_float_center.x,
        P_target.y - P_float_center.y
    );
    const vec2 = new Coordinate(
        Q_target.x - Q_float_center.x,
        Q_target.y - Q_float_center.y
    );
      return Math.abs(math.dot(vec1, vec2) / (euclidean_distance(P_target, P_float_center) * euclidean_distance(Q_target, Q_float_center)));
  }

  distance_from_center_compatibility(P, Q) {
    const P_source = this.data_nodes[P.source];
    const P_target = this.data_nodes[P.target];
    const Q_source = this.data_nodes[Q.source];
    const Q_target = this.data_nodes[Q.target];
    const P_float_center = this.culcurate_float_center(P_source);
    const Q_float_center = this.culcurate_float_center(Q_source);
    const P_distance = euclidean_distance(P_target, P_float_center);
    const Q_distance = euclidean_distance(Q_target, Q_float_center);
    const average_distance = (P_distance + Q_distance) / 2.0;
    return 2.0 / (average_distance / Math.min(P_distance, Q_distance) + Math.max(P_distance, Q_distance) / average_distance); 
  }

  compatibility_score(P, Q) {
    // console.log("afcc",this.angle_from_center_compatibility(P, Q),"cac",this.center_angle_compatibility(P, Q), "cdc", this.distance_from_center_compatibility(P, Q));
    // return this.center_angle_compatibility(P, Q) * this.distance_from_center_compatibility(P, Q) * this.position_compatibility(P, Q); // legacy
    return this.angle_from_center_compatibility(P, Q) * this.distance_from_center_compatibility(P, Q) * this.position_compatibility(P, Q); //modern
  }

}