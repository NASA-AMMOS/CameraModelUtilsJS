import { Ray, Vector3, BoxBufferGeometry, Mesh } from 'three';
import { getRay } from '../cahvore-utilities/index.js';

/*
 * Update the positions in a frustum based on the parameters by calling the CAHV or CAHVORE conversion methods.
 * It is required for the x and y values of the positions to be between [0, 1] to convert into image space.
 * options from createFrustumGeometry
 * positions the flat array of positions we are modifying
 */
function updateFrustumPositions(options, positions) {
    const position = new Vector3();
    const tempRay = new Ray();
    const tempOrigin = new Vector3();

    // if projectEnds is true then the near and far distances for the rays
    // are projected onto the near and far planes
    const projectDirection = options.A.clone().normalize();
    const projectEnds = false;

    for (let i = 0, l = positions.count; i < l; i++) {
        // get the x and y locations of the current vertex
        position.fromBufferAttribute(positions, i);

        // convert them into image space
        // This is why the range must be between [0, 1]
        position.x = position.x * options.width;
        position.y = position.y * options.height;

        getRay(options, position, tempRay);

        // convert the projection array to a point on the near or far plane
        if (projectEnds) {
            const zSign = position.z < 0;
            tempRay.direction.normalize();
            tempRay.direction.multiplyScalar(1 / tempRay.direction.dot(projectDirection));
            tempOrigin.copy(tempRay.origin).addScaledVector(tempRay.direction, zSign ? options.nearDist : options.farDist);
        } else {
            tempRay.at(position.z < 0 ? options.nearDist : options.farDist, tempOrigin);
        }

        // set the position
        positions.setXYZ(i, tempOrigin.x, tempOrigin.y, tempOrigin.z);
    }
}

/*
 * Create the geometry for the frustum. Takes CAHVOREOptions.
 */
function createFrustumGeometry(options) {
    const geom = new BoxBufferGeometry(1, 1, 1, options.widthSegments, options.heightSegments, 1);
    geom.translate(0.5, 0.5, 0);

    const positions = geom.getAttribute('position');
    updateFrustumPositions(options, positions);

    geom.setAttribute('position', positions);
    geom.computeVertexNormals();
    return geom;
}

/**
 * @typedef {Object} CAHVOREOptions
 * @param {('CAHV'|'CAHVOR','CAHVORE')} type CAHV or CAHVORE
 * @param {Number} width max number of pixels in width
 * @param {Number} height max number of pixels in height
 * @param {Vector3} C input model center
 * @param {Vector3} A input model axis
 * @param {Vector3} H input model horiz
 * @param {Vector3} V input model vert
 * @param {Vector3|null} [O=null] input model optical axis, only required for CAHVORE
 * @param {Vector3|null} [R=null] radial-distortion, only required for CAHVORE
 * @param {Vector3|null} [E=null] entrance-pupil, only required for CAHVORE
 * @param {Number} [linearity=1] linearity parameter, only required for CAHVORE
 * @param {Number} [nearDist=0.085] the distance between the camera model and the near plane
 * @param {Number} [farDist=10.0] the distance between the camera model and the far plane
 * @param {Number} [widthSegments=16] lthe number of segments to create along the x axis (all sides)
 * @param {Number} [heightSegments=16] lthe number of segments to create along the x axis (all sides)
 */

/**
 * Frustum for depicting the view volume of a camera.
 * This will be transformed using CAHV or CAHVORE settings.
 * @extends Mesh
 */
export class FrustumMesh extends Mesh {
    /**
     * @param {Material} material
     */
    constructor(material) {
        super();

        if (material && !material.isMaterial) {
            this.setParameters(arguments[0]);
            material = arguments[1];
        }
        this.material = material || this.material;
    }

    /**
     * Update the parameters of the CAHVORE frustum geometry.
     * @param {CAHVOREOptions} parameters
     */
    setParameters(parameters) {
        const defaultedParams = {
            type: 'CAHV',
            C: null,
            A: null,
            H: null,
            V: null,
            O: null,
            R: null,
            E: null,
            linearity: 1,
            width: 1,
            height: 1,

            nearDist: 0.085,
            farDist: 10.0,
            widthSegments: 16,
            heightSegments: 16,
            ...parameters,
        };

        this.geometry.dispose();
        this.geometry = createFrustumGeometry(defaultedParams);
    }

    copy(source) {
        super.copy(source);
        this.geometry.copy(source.geometry);
        return this;
    }
}
