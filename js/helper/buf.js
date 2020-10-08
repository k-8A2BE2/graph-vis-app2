function proportionallyBundle() {
    if (this.bundleState) {
      console.error("Graph is already bundled.");
      return;
    }

    const P_initial = 1;
    const P_rate_inout = 2;
    const P_rate_in = 2;
    const compatibility_threshold = 0.6;

    const currentViewport = this.viewer.getCurrentViewport();

    for (const edge of this.E_inout) {
      edge.computeBoundaryPoint(currentViewport);
    }

    const proportion = euclidean_distance(this.viewer.initialViewport.lower_left, this.viewer.initialViewport.upper_right) 
                     / euclidean_distance(currentViewport.lower_left, currentViewport.upper_right);
                     
    const B = new BFDEBMC(this.N, this.E_inout, currentViewport, this.viewer.initialViewport);
    B.compatibility_threshold = 0.8;
    B.P_rate = P_rate_inout;
    const E_curves = B.execute();

    const B_in = new normalFDEB(this.N, this.E_in);
    B_in.compatibility_threshold = compatibility_threshold;
    B_in.P_rate = P_rate_in;
    const E_in_curves = B_in.execute();

    const E_inout_splited = new Edges();
    for (var i = 0; i < this.E_inout.length; i++) {
      this.E_inout[i].switchSourceTarget(currentViewport);
      E_inout_splited.push(new SegmentEdge(this.E_inout[i], E_curves[0].length));
    }

    const E_in_splited = new Edges();
    for (let i = 0; i < this.E_in.length; i++) {
      E_in_splited.push(new SegmentEdge(this.E_in[i], E_in_curves[0].length));
    }

    console.log(E_in_curves);

    this.AE_inout = new AnimationEdges(this.viewer.scene, E_inout_splited, E_curves, 12);
    this.AE_in = new AnimationEdges(this.viewer.scene, E_in_splited, E_in_curves, 12);
    
    this.viewer.addObject(this.AE_inout.initializeFrameEdges());
    this.viewer.addObject(this.AE_in.initializeFrameEdges(0xff3e40));

    this.AQ.push( [this.E.hiding] );
    this.AQ.push( [this.AE_in.bundling,this.AE_inout.bundling] );

    this.bundleState = true;
  }