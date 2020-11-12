export class Palette {
    constructor() {
            this.c1 = "rgb(46,46,46)";
            this.c2 = "rgb(245,236,159)";
            this.c3 = "rgb(0,0,0)";
            this.c4 = "rgb(255,62,64)";
            this.c5 = "rgb(255,255,255)";
    }

    async importJSON(url) {
        await $.getJSON(url, (data) => {
            this.c1 = data.c1;
            this.c2 = data.c2;
            this.c3 = data.c3;
            this.c4 = data.c4;
            this.c5 = data.c5;
        });
    }

    async experiment() {
        this.c1 = "rgb(51,51,63)", 
        this.c2 = "rgb(20,200,188)",
        this.c3 = "rgb(97,20,199)",
        this.c4 = "#EC407A", 
        this.c5 = "#dfdfdf"
    }
}
