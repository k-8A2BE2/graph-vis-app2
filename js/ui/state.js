import { Checkbox, Pulldown } from "./uiCompoents.js"

export class State {
    constructor() {
        // parameter from user interface
        this.Ca = false;
        this.Cs = false;
        this.Cp = true;
        this.Cv = false;
        this.Cc = true;
        this.Cd = true;
        this.AutoBundle = true;
        this.subdivisionNumber = "fixed";
    }

    async initialize() {
        this.Ca = new Checkbox("switchCa");
        this.Cs = new Checkbox("switchCs");
        this.Cp = new Checkbox("switchCp");
        this.Cv = new Checkbox("switchCv");
        this.Cc = new Checkbox("switchCc");
        this.Cd = new Checkbox("switchCd");
        this.AutoBundle = new Checkbox("switchAuto");
        this.subdivisionNumber = new Pulldown("pulldownSubdivision");
    }
}