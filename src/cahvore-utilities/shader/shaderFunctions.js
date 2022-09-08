

export const cahvoreFunction =
/* glsl */`

#ifndef MAX_NEWTON
    #define MAX_NEWTON 100
#endif

#ifndef EPSILON
    #define EPSILON 1e-15
#endif

#ifndef CONV
    #define CONV 1e-8
#endif

#ifndef MAXITER
    #define MAXITER 20
#endif

// https://github.jpl.nasa.gov/telitwin/cmod/blob/7eae22ecfcf5e6c98c10829f3dfdc05ff7614f02/model/cmod_cahvore.c#L142-L431
void cmod_cahvore_2d_to_3d_general(
    vec2 pos2,	/* input 2D position */
    float linearity,	/* input linearity parameter */
    vec3 c,	/* input model center position vector   C */
    vec3 a,	/* input model orthog. axis unit vector A */
    vec3 h,	/* input model horizontal vector        H */
    vec3 v,	/* input model vertical vector          V */
    vec3 o,	/* input model optical axis unit vector O */
    vec3 r,	/* input model radial-distortion terms  R */
    vec3 e,	/* input model entrance-pupil    terms  E */
    out vec3 pos3,	/* output 3D origin of projection */
    out vec3 _uvec3	/* output unit vector ray of projection */
) {
    float avh1;
    float chi;
    float chi2;
    float chi3;
    float chi4;
    float chi5;
    float chip;
    vec3 cp;
    mat3 dcpdrp;
    vec3 dcpdx;
    vec3 dcpdy;
    mat3 drdrp;
    vec3 drdx;
    vec3 drdy;
    vec3 drpdx;
    vec3 drpdy;
    float lambdap;
    vec3 lambdap3;
    float linchi;
    mat3 m33;
    mat3 n33;
    vec3 ri;
    vec3 rp;
    float theta;
    float theta2;
    float theta3;
    float theta4;
    vec3 u3;
    vec3 v3;
    vec3 w3;
    float zetap;

    /* Check input */
    // CMOD_ASSERT("cmod_cahvore_2d_to_3d_general", r    != NULL);
    // CMOD_ASSERT("cmod_cahvore_2d_to_3d_general", e    != NULL);
    // CMOD_ASSERT("cmod_cahvore_2d_to_3d_general", pos2 != NULL);

    /* In the following there is a mixture of nomenclature from several */
    /* versions of Gennery's write-ups and Litwin's software. Beware!   */

    chi = 0.0;
    chi3 = 0.0;
    theta = 0.0;
    theta2 = 0.0;
    theta3 = 0.0;
    theta4 = 0.0;

    /* Calculate initial terms */

    scale3(pos2[1], a, u3);
    sub3(v, u3, u3);
    scale3(pos2[0], a, v3);
    sub3(h, v3, v3);
    cross3(u3, v3, w3);
    cross3(v, h, u3);
    avh1 = dot3(a, u3);
    // CMOD_ASSERT("cmod_cahvore_2d_to_3d_general", fabs(avh1) > EPSILON);
    avh1 = 1.0/avh1;
    scale3(avh1, w3, rp);

    zetap = dot3(rp, o);

    scale3(zetap, o, u3);
    sub3(rp, u3, lambdap3);

    lambdap = mag3(lambdap3);

    // CMOD_ASSERT("cmod_cahvore_2d_to_3d_general", fabs(zetap) > EPSILON);
    chip = lambdap / zetap;

    /* Approximations for small angles */
    if (chip < 1e-8) {
	copy3(c, cp);
	copy3(o, ri);
	}

    /* Full calculations */
    else {
	int n;
	float dchi;
	float s;

	/* Calculate chi using Newton's Method */
	n = 0;
	chi = chip;
	dchi = 1.0;
	for (;;) {
	    float deriv;

	    /* Make sure we don't iterate forever */
	    if (++n > MAX_NEWTON) {
		// CMOD_ERROR("cahvore_2d_to_3d_general", "too many iterations");
		break;
		}

	    /* Compute terms from the current value of chi */
	    chi2 = chi * chi;
	    chi3 = chi * chi2;
	    chi4 = chi * chi3;
	    chi5 = chi * chi4;

	    /* Check exit criterion from last update */
	    if (fabs(dchi) < 1e-8) {
		break;
		}

	    /* Update chi */
	    deriv = (1.0 + r[0]) + 3.0*r[1]*chi2 + 5.0*r[2]*chi4;
	    // CMOD_ASSERT("cmod_cahvore_2d_to_3d_general", fabs(deriv) > EPSILON);
	    dchi = ((1.0 + r[0])*chi + r[1]*chi3 + r[2]*chi5 - chip) / deriv;
	    chi -= dchi;
	    }

	/* Compute the incoming ray's angle */
	linchi = linearity * chi;
	if (linearity < -EPSILON) {
	    theta = asin(linchi) / linearity;
	    }
	else if (linearity > EPSILON) {
	    theta = atan(linchi) / linearity;
	    }
	else {
	    theta = chi;
	    }

	theta2 = theta * theta;
	theta3 = theta * theta2;
	theta4 = theta * theta3;

	/* Compute the shift of the entrance pupil */
	s = sin(theta);
	// CMOD_ASSERT("cmod_cahvore_2d_to_3d_general", fabs(s) > EPSILON);
	s = (theta/s - 1.0) * (e[0] + e[1]*theta2 + e[2]*theta4);

	/* The position of the entrance pupil */
	scale3(s, o, cp);
	add3(c, cp, cp);

	/* The unit vector along the ray */
	unit3(lambdap3, u3);
	scale3(sin(theta), u3, u3);
	scale3(cos(theta), o, v3);
	add3(u3, v3, ri);
	}

    copy3(cp, pos3);
    copy3(ri, _uvec3);
}

// https://github.jpl.nasa.gov/telitwin/cmod/blob/7eae22ecfcf5e6c98c10829f3dfdc05ff7614f02/model/cmod_cahvor.c#L72-L288
void cmod_cahvor_2d_to_3d(
    vec2 pos2,	/* input 2D position */
    vec3 c,	/* input model center position vector   C */
    vec3 a,	/* input model orthog. axis unit vector A */
    vec3 h,	/* input model horizontal vector        H */
    vec3 v,	/* input model vertical vector          V */
    vec3 o,	/* input model optical axis unit vector O */
    vec3 r,	/* input model radial-distortion terms  R */
    out vec3 pos3,	/* output 3D origin of projection */
    out vec3 _uvec3	/* output unit vector ray of projection */
) {
    int i;
    int j;
    float deriv;
    mat3 dldr;
    vec3 drdx;
    vec3 drdy;
    mat3 drpdr;
    mat3 drpdri;
    vec3 drpdx;
    vec3 drpdy;
    float du;
    float dudt;
    vec3 f;
    vec3 g;
    float k1;
    float k3;
    float k5;
    mat3 irrt;
    vec3 lambda;
    mat3 m33;
    float magi;
    float magv;
    float mu;
    mat3 n33;
    float omega;
    float omega_2;
    float poly;
    vec3 pp;
    vec3 rr;
    float sgn;
    vec3 t;
    float tau;
    vec3 u3;
    float u;
    float u_2;
    vec3 v3;
    vec3 w;
    vec3 wo;

    /* Check input */
    // CMOD_ASSERT("cmod_cahvor_2d_to_3d", r    != NULL);
    // CMOD_ASSERT("cmod_cahvor_2d_to_3d", pos2 != NULL);

    /* The projection point is merely the C of the camera model. */
    copy3(c, pos3);

    /* Calculate the projection ray assuming normal vector directions, */
    /* neglecting distortion.                                          */
    scale3(pos2[1], a, f);
    sub3(v, f, f);
    scale3(pos2[0], a, g);
    sub3(h, g, g);
    cross3(f, g, rr);
    magi = mag3(rr);
    // CMOD_ASSERT("cmod_cahvor_2d_to_3d", magi > EPSILON);
    magi = 1.0/magi;
    scale3(magi, rr, rr);

    /* Check and optionally correct for vector directions. */
    sgn = 1.0;
    cross3(v, h, t);
    if (dot3(t, a) < 0.0) {
	scale3(-1.0, rr, rr);
	sgn = -1.0;
	}

    /* Remove the radial lens distortion.  Preliminary values of omega,  */
    /* lambda, and tau are computed from the rr vector including         */
    /* distortion, in order to obtain the coefficients of the equation   */
    /* k5*u^5 + k3*u^3 + k1*u = 1, which is solved for u by means of     */
    /* Newton's method.  This value is used to compute the corrected rr. */
    omega = dot3(rr, o);
    omega_2 = omega * omega;
    // CMOD_ASSERT("cmod_cahvor_2d_to_3d", fabs(omega_2) > EPSILON);
    scale3(omega, o, wo);
    sub3(rr, wo, lambda);
    tau = dot3(lambda, lambda) / omega_2;
    k1 = 1.0 + r[0];		/*  1 + rho0 */
    k3 = r[1] * tau;		/*  rho1*tau  */
    k5 = r[2] * tau*tau;	/*  rho2*tau^2  */
    mu = r[0] + k3 + k5;
    u = 1.0 - mu;	/* initial approximation for iterations */
    for (i=0; i<MAXITER; i++) {
	u_2 = u*u;
	poly  =  ((k5*u_2  +  k3)*u_2 + k1)*u - 1.0;
	deriv = (5.0*k5*u_2 + 3.0*k3)*u_2 + k1;
	if (deriv <= EPSILON) {
	    // CMOD_ERROR("cmod_cahvor_2d_to_3d", "Distortion is too negative");
	    break;
	    }
	else {
	    du = poly/deriv;
	    u -= du;
	    if (fabs(du) < CONV) {
		break;
		}
	    }
	}
    if (i >= MAXITER) {
	// CMOD_ERROR_I("cmod_cahvor_2d_to_3d", "Too many iterations", i);
	}
    mu = 1.0 - u;
    scale3(mu, lambda, pp);
    sub3(rr, pp, _uvec3);
    magv = mag3(_uvec3);
    // CMOD_ASSERT("cmod_cahvor_2d_to_3d", fabs(magv) > EPSILON);
    scale3(1.0/magv, _uvec3, _uvec3);

    }

void cmod_cahv_2d_to_3d(
    vec2 pos2,	/* input 2D position */
    vec3 c,	/* input model center vector C */
    vec3 a,	/* input model axis   vector A */
    vec3 h,	/* input model horiz. vector H */
    vec3 v,	/* input model vert.  vector V */
    out vec3 pos3,	/* output 3D origin of projection */
    out vec3 _uvec3	/* output unit vector ray of projection */
) {
    int i;
    int j;
    vec3 f;
    vec3 g;
    mat3 irrt;
    float magi;
    float sgn;
    vec3 t;
    vec3 u;

    /* Check input */
    // CMOD_ASSERT("cmod_cahv_2d_to_3d", pos2  != NULL);
    // CMOD_ASSERT("cmod_cahv_2d_to_3d", _uvec3 != NULL);

    /* The projection point is merely the C of the camera model */
    copy3(c, pos3);

    /* Calculate the projection ray assuming normal vector directions */
    scale3(pos2[1], a, f);
    sub3(v, f, f);
    scale3(pos2[0], a, g);
    sub3(h, g, g);
    cross3(f, g, _uvec3);
    magi = mag3(_uvec3);
    // CMOD_ASSERT("cmod_cahv_2d_to_3d", magi > EPSILON);
    magi = 1.0/magi;
    scale3(magi, _uvec3, _uvec3);

    /* Check and optionally correct for vector directions */
    sgn = 1.0;
    cross3(v, h, t);
    if (dot3(t, a) < 0.0) {
	scale3(-1.0, _uvec3, _uvec3);
	sgn = -1.0;
	}
}
`;
