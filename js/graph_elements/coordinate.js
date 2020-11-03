export class Coordinate extends Array{
    constructor(x,y,z=0) {
      super(x,y,z);
      this.isIn = undefined;
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