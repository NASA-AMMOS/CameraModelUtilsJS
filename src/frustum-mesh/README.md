# Frustum Meshes

Set of three.js mesh utilities for generating and rendering camera view volumes for traditional OpenGL-style frustums as well as distorted CAHVORE-style ones.

# Use

```js
// initialize parameters for cahvore values
const parameters = { ...cahvoreModel };
parameters.nearDist = 0.5;
parameters.farDist = 15;

// create the frustum
const distortedFrustum = new FrustumMesh();
distortedFrustum.setFromCahvoreParameters( parameters );
distortedFrustum.material = new MeshPhongMaterial( {
	transparent: true,
	opacity: 0.25,
} );

scene.add( distortedFrustum );
```

# API

## CahvoreParameters

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

## CameraInfo

Set of options for passing into the `Frustum` object to generate the distorted frustum.

### .model

```js
model : CahvoreParameters
```

Object representing the CAHVORE parameters of the camera to represent.

### .near

```js
near : Number = 0.085
```

The projected distance for the near plane of the camera model frustum.

### .far

```js
far : Number = 10.0
```

The projected distance for the far plane of the camera model frustum.

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

_extends Mesh_

Frustum shape mesh for depicting the view volume of a camera.

### .constructor

```js
constructor( material : Material ) : void
```

### .setFromCahvoreParameters

```js
setParameters( parameters : CahvoreParameters ) : void
```

Update the parameters of the distorted frustum geometry. This will generate a frustum distorted by the camera model settings.

### .setFromProjectionMatrix

```js
setFromProjectionMatrix(
	projectionMatrix : Matrix4,
	frame : Matrix4,
	near : Number,
	far : Number
) : void
```

Updates the linear frustum view based on the provided projection matrix, camera transform frame, near, and far values. Creates a linear camera frustum facing the -Z axis with X to the right and Y up.

