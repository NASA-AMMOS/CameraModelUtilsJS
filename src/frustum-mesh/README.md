# Frustum Meshes

Set of simple telemetry primitives for drawing objects in the scene.

# Use

```js
// initialize parameters for cahvore values
const parameters = { ...cavoreModel };
parameters.nearDist = 0.5;
parameters.farDist = 15;

// create the frustum
const distortedFrustum = new FrustumMesh(
	parameters,
	new MeshPhongMaterial( {
		transparent: true,
		opacity: 0.25,
	} )
);

scene.add( distortedFrustum );
```

# API

## CAHVOREOptions

### .width

```js
width : Number
```

Number of pixels in width dimension in the camera model.

### .height

```js
height : Number
```

Number of pixels in height dimension in the camera model.

### .C

```js
C : Vector3
```

"C" center vector for the camera model.

### .A

```js
A : Vector3
```

"A" axis vector for the camera model.

### .H

```js
H : Vector3
```

"H" horizontal vector for the camera model.

### .V

```js
V : Vector3
```

"V" vertical vector for the camera model.

### .O

```js
O : Vector3 | null = null
```

"O" optical axis vector for the camera model. Only needed for CAHVOR / CAHVORE models.

### .R

```js
R : Vector3 | null = null
```

"R" radial-distortion axis vector for the camera model. Only needed for CAHVOR / CAHVORE models.

### .E

```js
E : Vector3 | null = null
```

"E" entrance-pupil vector for the camera model. Only needed for CAHVORE models.

### .linearity

```js
linearity : Number = 1
```

Linearity parameter. Only required for CAHVORE models.

### .near

```js
near : Number = 0.085
```

The projected distance for the near plane of the camera model frustum.

TODO: change name in implementation

### .far

```js
far : Number = 10.0
```

The projected distance for the far plane of the camera model frustum.

TODO: change name in implementation

### .widthSegments

```js
widthSegments : Number = 16
```

The number of segments to create along the x axis on all sides.

### .heightSegments

```js
heightSegments : Number = 16
```

The number of segments to create along the y axis on all sides.

### .planarProjectionFactor

```js
planarProjectionFactor : Number = 0
```

Value in the range [0, 1]. Indicates how much the ends will be projected to be planar rather than rounded on the near and far ends.

## FrustumMesh

Frustum for depicting the view volume of a camera. This will be transformed using the camera model settings.

_extends Mesh_

### .constructor

```js
constructor( parameters : CAHVOREOptions = undefined, material : Material = undefined ) : void
```

TODO (add parameters support)

### .setParameters

```js
setParameters( parameters : CAHVOREOptions ) : void
```

Update the parameters of the distorted frustum geometry.

## LinearFrustumMesh

Create a linear camera frustum facing the -Z axis with X to the right and Y up.

_extends Mesh_

### .setFromProjectionMatrix

```js
setFromProjectionMatrix(
	projectionMatrix : Matrix4, 
	frame : Matrix4, 
	near : Number, 
	far : Number
) : void
```

Updates the linear frustum view based on the provided projection matrix, camera transform frame, near, and far values.
