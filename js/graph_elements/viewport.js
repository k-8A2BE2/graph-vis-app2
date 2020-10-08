import { Coordinate } from "./coordinate.js"
import { euclidean_distance, intersection, judge_intersection } from "../helper/subfunctions.js"

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