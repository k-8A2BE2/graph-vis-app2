export class Checkbox {
    constructor(id) {
        this.element = document.getElementById(id)
        this.checked = this.element.checked;
        this.initializeChangeEvent();
    }
    initializeChangeEvent() {
        this.element.addEventListener("change", () => {
            this.checked = this.element.checked;
        })
    }
}

export class CheckboxWithFunc {
    constructor(id, func1, func2) {
        this.element = document.getElementById(id)
        this.checked = this.element.checked;
        this.initializeChangeEvent(func1, func2);
    }

    initializeChangeEvent(func1, func2) {
        this.element.addEventListener("change", () => {
            this.checked = this.element.checked;
            if (this.checked) {
                func1();
            } else {
                func2();
            }
        });
    }
}

export class Pulldown {
    constructor(id) {
        this.element = document.getElementById(id);
        this.value = this.element.value;
        this.initializeChangeEvent();
    }

    initializeChangeEvent() {
        this.element.addEventListener("change", () => {
            this.value = this.element.value;
            console.log(this.value);
        });
    }
}

export class Button {
    constructor(id, func) {
        this.element = document.getElementById(id);
        this.initializeClickEvent(func);
    }

    initializeClickEvent(func) {
        this.element.addEventListener("click", () => {
            func();
        });
    }
}

