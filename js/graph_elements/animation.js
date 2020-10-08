export class Animation {
  constructor(animateFunction, initializeFunction=function(){}, finallizeFunction=function(){}) {
    this.animate = animateFunction;
    this.initialize = initializeFunction;
    this.finalize = finallizeFunction;
  }
}

export class AnimationQueue {
  constructor() {
    this.animationList = [];
    this.initializeList = [];
    this.finalizeList = [];
    this.finishFrags = [false];
  }

  push(animations) {
    this.pushAnimation( animations );
    this.pushInitialize( animations );
    this.pushFinalize( animations );
    if (this.finishFrags.every( (e) => !e )) {
      this.finishFrags = new Array(this.animationList[0].length).fill(true);
    }
  }

  pushAnimation(animations) {
    let sync = [];
    for (var i = 0; i < animations.length; i++) {
      sync.push( animations[i].animate );
    }
    this.animationList.push( sync );
  }

  pushInitialize(animations) {
    let sync = [];
    for (var i = 0; i < animations.length; i++) {
      sync.push( animations[i].initialize );
    }
    this.initializeList.push( sync );
  }

  pushFinalize(animations) {
    let sync = [];
    for (var i = 0; i < animations.length; i++) {
      sync.push( animations[i].finalize );
    }
    this.finalizeList.push( sync );
  }

  updateFinishFrags() {
    if (this.finishFrags.every( (e) => !e )) {
      this.animationList.shift();
      if ( this.animationList.length >= 1) {
        this.finishFrags = new Array(this.animationList[0].length).fill(true);
      }
      this.finalizeQueue();
    }
  }

  animateQueue() {
    if ( this.animationList.length > 0 ) {
      for (var i = 0; i < this.animationList[0].length; i++) {
        if (this.finishFrags[i]) {
          this.finishFrags[i] = this.animationList[0][i]();
        }
      }
      this.updateFinishFrags();
    }
  }

  finalizeQueue() {
    if ( this.finalizeList.length > 0 ) {
      for (var i = 0; i < this.finalizeList[0].length; i++) {
        this.finalizeList[0][i]();
      }
      this.finalizeList.shift();
    }
  }

}
