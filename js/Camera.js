import * as THREE from './lib/three.module.js';

class Camera {
    constructor(scene) {
        this.scene = scene;

        // Create the camera
        this.instance = new THREE.PerspectiveCamera(
            100, 
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, 
            1000 
        );

        // Initial position
        this.instance.position.set(3, 16, -10); // Initial top-down view
        this.instance.lookAt(0, 0, 0);

        // Camera settings
        this.followDistance = 12; 
        this.followHeight = 12; 
        this.rotationSpeed = 0.05;
        this.targetPosition = new THREE.Vector3(); 
        this.currentPosition = new THREE.Vector3(); 

        // This is done to prevent flipping
        this.instance.up.set(0, 1, 0);

        // Initialize the event listeners
        this.init();
    }

    init() {
        window.addEventListener('resize', () => this.onResize());
    }

    onResize() {
        // Adjust the camera aspect ration when the user is resizing the window
        this.instance.aspect = window.innerWidth / window.innerHeight;
        this.instance.updateProjectionMatrix();
    }

    followTarget(target) {
        if (!target) return;

        // Get the Caar's forward direction
        const forward = new THREE.Vector3(0, 0, -1);
	// Rotate the vector to match the car's rotation
        forward.applyQuaternion(target.quaternion); 

        // Calculate the position of the camera
        const offset = forward.clone().multiplyScalar(-this.followDistance); 
	// Offset behind the car
        offset.y = this.followHeight; 
	    // Add some vertical offset as well
        this.targetPosition.copy(target.position).add(offset);

        // Make it smooth
        this.currentPosition.lerp(this.targetPosition, this.rotationSpeed);
        this.instance.position.copy(this.currentPosition);
        // Make the camera look at the target
        this.instance.lookAt(target.position);
    }
    update(deltaTime) {
	    // This is not needed 
    }
}

export { Camera };

