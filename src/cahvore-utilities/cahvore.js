import { Vector3 } from 'three';

const EPSILON = 1e-15;
const BIGGER_EPSILON = 1e-8;
const MAX_NEWTON = 100;
const MAXITER = 20;
const CONV = 1.0e-8; // covergence tolerance

function assert( statement, message ) {

	if ( ! statement ) {

		console.assert( statement, message );
		throw new Error( message );

	}

}

const u3 = new Vector3();
const v3 = new Vector3();
const w3 = new Vector3();
const rp = new Vector3();
const lambdap3 = new Vector3();
const cp = new Vector3();
const ri = new Vector3();

/**
 * Algorithm by Todd Litwin
 * Partially ported from
 * {@link https://github.jpl.nasa.gov/telitwin/cmod/blob/7eae22ecfcf5e6c98c10829f3dfdc05ff7614f02/model/cmod_cahvore.c#L142-L431 cmod_cahvore}.
 *
 * This function projects a 2D image point out into 3D using the
 * camera model parameters provided.
 * Note this port does not calculate partial derivatives of pos3 to pos2 or uvec3 to uvec2
 * @param {Vector2} pos2 input 2D position
 * @param {Number} linearity input linearity parameter
 * @param {Vector3} c input model center position vector
 * @param {Vector3} a input model orthog. axis unit vector
 * @param {Vector3} h input model horizontal vector
 * @param {Vector3} v input model vertical vector
 * @param {Vector3} o input model optical axis unit vector
 * @param {Vector3} r input model radial-distortion terms
 * @param {Vector3} e input model entrance-pupil
 * @param {Vector3} [pos3=null] output 3d origin of projection
 * @param {Vector3} [uvec3=null] output direction of projection
 * @returns {({ pos3, uvec3 })} dictinoary including pos3, vector3
 */
function cmod_cahvore_2d_to_3d_general( pos2, linearity, c, a, h, v, o, r, e, pos3, uvec3 ) {

	pos3 = pos3 || new Vector3();
	uvec3 = uvec3 || new Vector3();
	assert( pos2, 'CAHVORE 2d to 3d pos2 is empty' );
	assert( o && o instanceof Vector3, 'Invalid O in CAHVORE' );
	assert( r && r instanceof Vector3, 'Invalid R in CAHVORE' );
	assert( e && e instanceof Vector3, 'Invalid E in CAHVORE' );

	/* In the following there is a mixture of nomenclature from several */
	/* versions of Gennery's write-ups and Litwin's software. Beware!   */

	/* Calculate initial terms */
	u3.copy( a ).multiplyScalar( pos2.y );
	u3.subVectors( v, u3 );
	v3.copy( a ).multiplyScalar( pos2.x );
	v3.subVectors( h, v3 );
	w3.crossVectors( u3, v3 );
	u3.crossVectors( v, h );
	let avh1 = a.dot( u3 );
	assert( Math.abs( avh1 ) > EPSILON, 'avh1 too small' );
	avh1 = 1.0 / avh1;
	rp.copy( w3 ).multiplyScalar( avh1 );

	const zetap = rp.dot( o );

	u3.copy( o ).multiplyScalar( zetap );
	lambdap3.subVectors( rp, u3 );

	const lambdap = lambdap3.length();

	assert( Math.abs( zetap ) > EPSILON, 'zetap too small' );
	const chip = lambdap / zetap;

	/* Approximations for small angles */
	if ( chip < BIGGER_EPSILON ) {

		cp.copy( c );
		ri.copy( o );

	} else {

		/* Full calculations */
		/* Calculate chi using Newton's Method */
		let n = 0.0;
		let chi = chip;
		let dchi = 1.0;

		let chi2, chi3, chi4, chi5;

		// eslint-disable-next-line no-constant-condition
		while ( true ) {

			if ( ++ n > MAX_NEWTON ) {

				console.error( 'cahvore_2d_to_3d_general: too many iterations' );
				break;

			}

			/* Compute terms from the current value of chi */
			chi2 = chi * chi;
			chi3 = chi * chi2;
			chi4 = chi * chi3;
			chi5 = chi * chi4;

			/* Check exit criterion from last update */
			if ( Math.abs( dchi ) < BIGGER_EPSILON ) {

				break;

			}

			/* Update chi */
			const deriv = 1.0 + r.x + 3.0 * r.y * chi2 + 5.0 * r.z * chi4;
			assert( Math.abs( deriv ) > EPSILON, 'deriv too small' );
			dchi = ( ( 1.0 + r.x ) * chi + r.y * chi3 + r.z * chi5 - chip ) / deriv;
			chi -= dchi;

		}

		/* Compute the incoming ray's angle */
		const linchi = linearity * chi;
		let theta;
		if ( linearity < - EPSILON ) {

			theta = Math.asin( linchi ) / linearity;

		} else if ( linearity > EPSILON ) {

			theta = Math.atan( linchi ) / linearity;

		} else {

			theta = chi;

		}

		const theta2 = theta * theta;
		const theta3 = theta * theta2;
		const theta4 = theta * theta3;

		/* Compute the shift of the entrance pupil */
		let s = Math.sin( theta );
		assert( Math.abs( s ) > EPSILON, 's too small' );
		s = ( theta / s - 1.0 ) * ( e.x + e.y * theta2 + e.z * theta4 );

		/* The position of the entrance pupil */
		cp.copy( o ).multiplyScalar( s );
		cp.add( c );

		/* The unit vector along the ray */
		u3.copy( lambdap3 ).normalize();
		u3.multiplyScalar( Math.sin( theta ) );
		v3.copy( o ).multiplyScalar( Math.cos( theta ) );
		ri.addVectors( u3, v3 );

	}

	pos3.copy( cp );
	uvec3.copy( ri );

	return { pos3, uvec3 };

}

const f = new Vector3();
const g = new Vector3();
const t = new Vector3();

/**
 * Algorithm by Todd Litwin
 * Partially ported from
 * {@link https://github.jpl.nasa.gov/telitwin/cmod/blob/7eae22ecfcf5e6c98c10829f3dfdc05ff7614f02/model/cmod_cahv.c#L57-L123 cmod_cahv}.
 *
 * Uses the Yakimovsky & Cunningham camera model known locally as CAHV
 * This function projects a 2D image point out into 3D using the camera model parameters provided.
 * Note it does not output the partial derivative of uvec3 to pos2
 *
 * @param {Vector2} pos2 input 2D position
 * @param {Vector3} c input model center
 * @param {Vector3} a input model axis
 * @param {Vector3} h input model horiz
 * @param {Vector3} v input model vert
 * @param {Vector3} [pos3=null] output origin of projection
 * @param {Vector3} [uvec3=null] output direction of projection
 * @returns {({pos3, uvec3})}
 */
function cmod_cahv_2d_to_3d( pos2, c, a, h, v, pos3, uvec3 ) {

	pos3 = pos3 || new Vector3();
	uvec3 = uvec3 || new Vector3();

	/* Check input */
	assert( pos2, 'CAHV 2d to 3d pos2 is empty' );
	assert( c && c instanceof Vector3, 'Invalid C in CAHV' );
	assert( a && a instanceof Vector3, 'Invalid A in CAHV' );
	assert( h && h instanceof Vector3, 'Invalid H in CAHV' );
	assert( v && v instanceof Vector3, 'Invalid V in CAHV' );

	/* The projection point is merely the C of the camera model */
	pos3.copy( c );

	/* Calculate the projection ray assuming normal vector directions */
	f.copy( a );
	f.multiplyScalar( pos2.y );
	f.subVectors( v, f );
	g.copy( a );
	g.multiplyScalar( pos2.x );
	g.subVectors( h, g );
	uvec3 = uvec3.crossVectors( f, g );
	let magi = uvec3.length();
	assert( magi > EPSILON, 'CAHV 2d to 3d length of direction is too small' );
	magi = 1.0 / magi;
	uvec3.multiplyScalar( magi );

	/* Check and optionally correct for vector directions */
	let sgn = 1;
	t.crossVectors( v, h );
	if ( t.dot( a ) < 0 ) {

		uvec3.multiplyScalar( - 1.0 );
		sgn = - 1;

	}

	return { pos3, uvec3 };

}

const lambda = new Vector3();
const pp = new Vector3();
const rr = new Vector3();
const wo = new Vector3();

/**
 * Algorithm by Todd Litwin
 * Partially ported from
 * {@link https://github.jpl.nasa.gov/telitwin/cmod/blob/7eae22ecfcf5e6c98c10829f3dfdc05ff7614f02/model/cmod_cahvor.c#L72-L288 cmod_cahvor}.
 *
 * Uses the Yakimovsky & Cunningham camera model known locally as CAHVOR
 * This function projects a 2D image point out into 3D using the camera model parameters provided.
 * Note it does not output the partial derivative of uvec3 to pos2
 *
 * @param {Vector2} pos2 input 2D position
 * @param {Vector3} c input model center
 * @param {Vector3} a input model axis
 * @param {Vector3} h input model horiz
 * @param {Vector3} v input model vert
 * @param {Vector3} o input model optical axis unit vector
 * @param {Vector3} r input model radial-distortion terms
 * @param {Vector3} [pos3=null] output origin of projection
 * @param {Vector3} [uvec3=null] output direction of projection
 * @returns {({pos3, uvec3})}
 */
function cmod_cahvor_2d_to_3d( pos2, c, a, h, v, o, r, pos3, uvec3 ) {

	let i;
	let deriv;
	let du;
	let k1;
	let k3;
	let k5;
	let magi;
	let magv;
	let mu;
	let omega;
	let omega_2;
	let poly;
	let sgn;
	let tau;
	let u;
	let u_2;

	/* Check input */
	assert( pos2, 'CAHV 2d to 3d pos2 is empty' );
	assert( r && r instanceof Vector3, 'Invalid R in CAHVOR' );

	/* The projection point is merely the C of the camera model. */
	pos3.copy( c );


	/* Calculate the projection ray assuming normal vector directions, */
	/* neglecting distortion.                                          */
	f.copy( a ).multiplyScalar( pos2.y );
	f.subVectors( v, f );
	g.copy( a ).multiplyScalar( pos2.x );
	g.subVectors( h, g );
	rr.crossVectors( f, g );
	magi = rr.length();
	assert( magi > EPSILON, 'CAHV 2d to 3d length of direction is too small' );
	magi = 1.0 / magi;
	rr.multiplyScalar( magi );

	/* Check and optionally correct for vector directions. */
	sgn = 1;
	t.crossVectors( v, h );
	if ( t.dot( a ) < 0 ) {

		rr.multiplyScalar( - 1 );
		sgn = - 1;

	}

	/* Remove the radial lens distortion.  Preliminary values of omega,  */
	/* lambda, and tau are computed from the rr vector including         */
	/* distortion, in order to obtain the coefficients of the equation   */
	/* k5*u^5 + k3*u^3 + k1*u = 1, which is solved for u by means of     */
	/* Newton's method.  This value is used to compute the corrected rr. */
	omega = rr.dot( o );
	omega_2 = omega * omega;
	assert( Math.abs( omega_2 ) > EPSILON, 'cmod_cahvor_2d_to_3d' );

	wo.copy( o ).multiplyScalar( omega );
	lambda.subVectors( rr, wo );

	tau = lambda.dot( lambda ) / omega_2;
	k1 = 1 + r.x; /*  1 + rho0 */
	k3 = r.y * tau; /*  rho1*tau  */
	k5 = r.z * tau * tau; /*  rho2*tau^2  */
	mu = r.x + k3 + k5;
	u = 1.0 - mu; /* initial approximation for iterations */

	for ( i = 0; i < MAXITER; i ++ ) {

		u_2 = u * u;
		poly = ( ( k5 * u_2 + k3 ) * u_2 + k1 ) * u - 1;
		deriv = ( 5 * k5 * u_2 + 3 * k3 ) * u_2 + k1;
		if ( deriv <= EPSILON ) {

			throw new Error( 'cmod_cahvor_2d_to_3d: Distortion is too negative' );

		} else {

			du = poly / deriv;
			u -= du;
			if ( Math.abs( du ) < CONV ) {

				break;

			}

		}

	}

	if ( i >= MAXITER ) {

		new Error( 'cmod_cahvor_2d_to_3d: Too many iterations ' + i );

	}

	mu = 1 - u;
	pp.copy( lambda ).multiplyScalar( mu );
	uvec3.subVectors( rr, pp );
	magv = uvec3.length();
	assert( Math.abs( magv ) > EPSILON, 'cmod_cahvor_2d_to_3d' );
	uvec3.multiplyScalar( 1.0 / magv );

	return { pos3, uvec3 };

}

export { cmod_cahvore_2d_to_3d_general, cmod_cahv_2d_to_3d, cmod_cahvor_2d_to_3d };
