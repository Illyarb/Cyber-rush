
export class MenuUI {
    constructor() {
        this.menuElement = document.getElementById('menuOverlay');
    }

    show() {
        this.menuElement.style.display = 'flex';
    }

    hide() {
        this.menuElement.style.display = 'none';
    }
}

