import { Checkbox, Pulldown } from "./uiCompoents.js"

export class State {
    constructor() {
        // parameter from user interface
        this._Ca = false;
        this._Cs = false;
        this._Cp = true;
        this._Cv = false;
        this._Cc = true;
        this._Cd = true;
        this._AutoBundle = true;
        this._subdivisionNumber = "fixed";
    }

    async initialize() {
        this.uiCa = new Checkbox("switchCa");
        this.uiCs = new Checkbox("switchCs");
        this.uiCp = new Checkbox("switchCp");
        this.uiCv = new Checkbox("switchCv");
        this.uiCc = new Checkbox("switchCc");
        this.uiCd = new Checkbox("switchCd");
        this.uiAutoBundle = new Checkbox("switchAuto");
        this.uisubdivisionNumber = new Pulldown("pulldownSubdivision");
    }

    get AutoBundle() {
        return this.uiAutoBundle ? this.uiAutoBundle.checked : this._AutoBundle;
    }

    get subdivisionNumber() {
        return this.uiSubdivisionNumber ? this.uiSubdivisionNumber.value : this._subdivisionNumber;
    }
}