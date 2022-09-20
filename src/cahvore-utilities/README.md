# CAHVORE Transformation Utilities

Set of functions for converting a 2D camera coordinate to a camera ray ported from the [original C implementation](https://github.jpl.nasa.gov/telitwin/cmod/blob/master/model/cmod_cahv.c) (JPL internal only).

Original implementation by Todd Litwin.

# Use

## Ray Derivation
```js
// get the projected bounds info.
const modelInfo = getLinearFrustumInfo( cahvoreModel );

// retrieves the ray distorted by the model at the given point
const ray = new Ray();
const imageCoord = new Vector2( modelInfo.width * 0.5, modelInfo.height * 0.5 );
getRay( cahvoreModel, imageCoord, ray );
```

## Frustum Derivation and Preview
```js
// retrieves the linear frustum inscribed in the frustum formed by
// the minimum points inside the distorted frustum shape and specified
// in the modelInfo.frame.
const minFrustum = new Matrix4();
frameBoundsToProjectionMatrix( modelInfo.minFrameBounds, 0.1, 15.0, minFrustum );

// retrieves the linear frustum circumscribed on the frustum formed by
// the maximum points inside the distorted frustum shape and specified
// in the modelInfo.frame.
const maxFrustum = new Matrix4();
frameBoundsToProjectionMatrix( modelInfo.maxFrameBounds, 0.1, 15.0, maxFrustum );

// render the scene with the max frustum
const aspect = cahvoreModel.width / cahvoreModel.height;
const renderTarget = new WebGLRenderTarget( 1000 * aspect, 1000 ); // TODO: set from model dimensions
camera.projectionMatrix.copy( maxFrustum );
camera.projectionMatrixInverse .copy( maxFrustum ).invert();
renderer.setRenderTarget( renderTarget );
renderer.render( scene, camera );
renderer.setRenderTarget( null );

// initialize the material and render the distorted view
const distortionMaterial = new CahvoreDistortionMaterial();
distortionMaterial.map = renderTarget;
distortionMaterial.setFromCameraModel( cahvoreModel );

// render the distortion with a full screen pass
const pass = new FullScreenQuad( distortionMaterial );
pass.render( renderer );
```

# API

## Functions

### cmod_cahvore_2d_to_3d_general

```js
cmod_cahvore_2d_to_3d_general(
	pos2 : Vector2,
	linearity : Number,
	c : Vector3,
	a : Vector3,
	h : Vector3,
	v : Vector3,
	o : Vector3,
	r : Vector3,
	e : Vector3,
	pos3 : Vector3 = null,
	uvec3 : Vector3 = null
) : { pos3, uvec3 }
```

Partially ported from [cmod_cahvore](https://github.jpl.nasa.gov/telitwin/cmod/blob/7eae22ecfcf5e6c98c10829f3dfdc05ff7614f02/model/cmod_cahvore.c#L142-L431).

This function projects a 2D image point out into 3D using the camera model parameters provided. Note this port does not calculate partial derivatives of pos3 to pos2 or uvec3 to uvec2.

### cmod_cahv_2d_to_3d

```js
cmod_cahv_2d_to_3d(
	pos2 : Vector2,
	c : Vector3,
	a : Vector3,
	h : Vector3,
	v : Vector3,
	pos3 : Vector3 = null,
	uvec3 : Vector3 = null
) : { pos3, uvec3 }
```

Partially ported from [cmod_cahv](https://github.jpl.nasa.gov/telitwin/cmod/blob/7eae22ecfcf5e6c98c10829f3dfdc05ff7614f02/model/cmod_cahv.c#L57-L123).

Uses the Yakimovsky & Cunningham camera model known locally as CAHV. This function projects a 2D image point out into 3D using the camera model parameters provided. Note it does not output the partial derivative of uvec3 to pos2.

### cmod_cahvor_2d_to_3d

```js
cmod_cahvor_2d_to_3d(
	pos2 : Vector2,
	c : Vector3,
	a : Vector3,
	h : Vector3,
	v : Vector3,
	o : Vector3,
	r : Vector3,
	pos3 : Vector3 = null,
	uvec3 : Vector3 = null
) : { pos3, uvec3 }
```

Partially ported from [cmod_cahvor](https://github.jpl.nasa.gov/telitwin/cmod/blob/7eae22ecfcf5e6c98c10829f3dfdc05ff7614f02/model/cmod_cahvor.c#L72-L288).

Functions for using the camera model known locally as CAHVOR. This model is an extension by Donald Gennery into radial distortion of the linear model by Yakimovsky & Cunningham, known locally as CAHV. Note it does not output the partial derivative of uvec3 to pos2.

### getRay

```js
getRay( model : CahvoreParamaters, sample : Vector2, outRay : Ray ) : void
```

Returns the outgoing ray from the camera model given an image sample coordinate. Internally calls the appropriate camera model to ray function.

The "sample" vector is in pixel values that must fall within the model.width and model.height.

### getLinearFrustumInfo

```js
getLinearFrustumInfo( model : CahvoreParamaters ) : LinearFrustumInfo
```

Function takes a camera model and returns an object describing the resulting local camera frame and minimum and maximum frustums.

### frameBoundsToProjectionMatrix

```js
frameBoundsToProjectionMatrix(
	frameBounds : FrameBounds,
	near : Number,
	far : Number,
	target : Matrix4
) : target
```

Function that takes a frame bounds description of a bounding box 1m out in the camera frame and sets the "target" matrix to an off axis projection matrix with the apex at the current origin.

## CahvoreParameters

See `CahvoreParamaters` description [here](../frustum-mesh/README.md#CahvoreParamaters).

## FrameBounds

### .left

```js
left : Number
```

### .right

```js
right : Number
```

### .top

```js
top : Number
```

### .bottom

```js
bottom : Number
```

## LinearFrustumInfo

### .frame

```js
frame : Matrix4
```

The transformation frame of the linear camera model frustums. Equivalent to "Camera.matrix".

### .minFrameBounds

```js
minFrameBounds : FrameBounds
```

The bounds that are completely encompassed the cahvore model at the minimal extents 1m out in the given frame.

### .maxFrameBounds

```js
maxFrameBounds : FrameBounds
```

The bounds that completely encompass the cahvore model at the maximum extents 1m out in the given frame.

## CahvoreDistortionMaterial

_extends THREE.ShaderMaterial_

### Uniforms

```js
{
	// the render target rendered with the maximum view render to apply distortion to
	map = null : Texture
}
```

### .passthrough

```js
passthrough = false : Boolean
```

If true then the "map" value is rendered as passthrough with no distortion applied.

### .checkerboard

```js
checkerboard = false : Boolean
```

If true then a checkerboard modeling the distortion is rendered.

### .setFromCameraModel

```js
setFromCameraModel( model : CahvoreParameters ) : void
```

Sets the necessary uniforms to properly distort the camera preview.
