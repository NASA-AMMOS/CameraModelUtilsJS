import { Mesh, BoxBufferGeometry, Vector3, Matrix4 } from 'three';

const tempVec = new Vector3();
const inverseMatrix = new Matrix4();

/**
 * Create a linear camera frustum facing the -Z axis with X
 * to the right and Y up.
 *
 * @extends Mesh
 */
export class LinearFrustumMesh extends Mesh {

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

}
