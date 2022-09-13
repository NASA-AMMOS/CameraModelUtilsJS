import { Ray, Vector3, BoxBufferGeometry, Mesh, Matrix4 } from 'three';
import { getRay } from '../cahvore-utilities/index.js';

const tempVec = new Vector3();
const planeProjectedVec = new Vector3();
const inverseMatrix = new Matrix4();
const position = new Vector3();
const tempRay = new Ray();

/*
 * Update the positions in a frustum based on the parameters by calling the CAHV or CAHVORE conversion methods.
 * It is required for the x and y values of the positions to be between [0, 1] to convert into image space.
 * options from createFrustumGeometry
 * positions the flat array of positions we are modifying
 */
function updateFrustumPositions( options, positions ) {

	// if projectEnds is true then the near and far distances for the rays
	// are projected onto the near and far planes
	const projectDirection = options.A.clone().normalize();

	for ( let i = 0, l = positions.count; i < l; i ++ ) {

		// get the x and y locations of the current vertex
		position.fromBufferAttribute( positions, i );

		// convert them into image space
		// This is why the range must be between [0, 1]
		position.x = position.x * options.width;
		position.y = position.y * options.height;

		getRay( options, position, tempRay );

		// get the point at the given distance along the ray
		tempRay.at( position.z < 0 ? options.near : options.far, tempVec );

		// get the plane-projected version of the near / far point
		const zSign = position.z < 0;
		tempRay.direction.normalize();
		tempRay.direction.multiplyScalar( 1 / tempRay.direction.dot( projectDirection ) );
		planeProjectedVec.copy( tempRay.origin ).addScaledVector( tempRay.direction, zSign ? options.near : options.far );

		// interpolate to the plane vector based on planar factor
		tempVec.lerp( planeProjectedVec, options.planarProjectionFactor );

		// set the position
		positions.setXYZ( i, tempVec.x, tempVec.y, tempVec.z );

	}

}

/*
 * Create the geometry for the frustum. Takes CahvoreParameters.
 */
function createCahvoreFrustumGeometry( options ) {

	const geom = new BoxBufferGeometry( 1, 1, 1, options.widthSegments, options.heightSegments, 1 );
	geom.translate( 0.5, 0.5, 0 );

	const positions = geom.getAttribute( 'position' );
	updateFrustumPositions( options, positions );

	geom.setAttribute( 'position', positions );
	geom.computeVertexNormals();
	return geom;

}

/**
 * @typedef {Object} CahvoreParameters
 * @param {('CAHV'|'CAHVOR'|'CAHVORE')} type CAHV, CAHVOR, or CAHVORE
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
 * @param {Number} [near=0.085] the distance between the camera model and the near plane
 * @param {Number} [far=10.0] the distance between the camera model and the far plane
 * @param {Number} [widthSegments=16] the number of segments to create along the x axis (all sides)
 * @param {Number} [heightSegments=16] the number of segments to create along the x axis (all sides)
 * @param {Number} [planarProjectionFactor=0]
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
	constructor( material ) {

		super();
		this.material = material || this.material;

	}

	/**
     * Update the parameters of the CAHVORE frustum geometry.
     * @param {CahvoreParameters} parameters
     */
	setFromCahvoreParameters( parameters ) {

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

			near: 0.085,
			far: 10.0,
			widthSegments: 16,
			heightSegments: 16,
			planarProjectionFactor: 0,
			...parameters,
		};

		this.geometry.dispose();
		this.geometry = createCahvoreFrustumGeometry( defaultedParams );

	}

	/**
     * Updates the linear frustum view based on the provided projection matrix, frame, near, and far values.
     * @param {Matrix4} projectionMatrix
     * @param {Matrix4} frame
     * @param {Number} near
     * @param {Number} far
     */
	setFromProjectionMatrix( projectionMatrix, frame, near, far ) {

		inverseMatrix.copy( projectionMatrix ).invert();

		const geometry = new BoxBufferGeometry();
		const posAttr = geometry.getAttribute( 'position' );

		for ( let i = 0, l = posAttr.count; i < l; i ++ ) {

			tempVec.fromBufferAttribute( posAttr, i ).multiplyScalar( 2.0 );
			const zSign = Math.sign( tempVec.z );

			tempVec.applyMatrix4( inverseMatrix );
			tempVec.multiplyScalar( 1 / Math.abs( tempVec.z ) );

			const dist = zSign < 0 ? far : near;
			tempVec.multiplyScalar( dist );
			posAttr.setXYZ( i, tempVec.x, tempVec.y, tempVec.z );

		}

		geometry.applyMatrix4( frame );
		this.geometry = geometry;

	}

	copy( source ) {

		super.copy( source );
		this.geometry.copy( source.geometry );
		return this;

	}

}
