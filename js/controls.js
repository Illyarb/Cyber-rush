export class Controls {
    constructor() {
        this.keys = {};
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
        });
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }
    isPressed(keyCode) {
        return this.keys[keyCode] === true;
    }
}
