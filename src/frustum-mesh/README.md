# Frustum Meshes

Set of simple telemetry primitives for drawing objects in the scene.

# Use

```js

```

# API

## CAHVOREOptions

### width

```js
width : Number
```

max number of pixels in width

### height

```js
height : Number
```

max number of pixels in height

### C

```js
C : Vector3
```

input model center

### A

```js
A : Vector3
```

input model axis


### H

```js
H : Vector3
```

input model horiz

### V

```js
V : Vector3
```

input model vert

### O

```js
O : Vector3 | null = null
```

input model optical axis, only required for CAHVORE

### R

```js
R : Vector3 | null = null
```

radial-distortion, only required for CAHVORE

### E

```js
E : Vector3 | null = null
```

entrance-pupil, only required for CAHVORE

### linearity

```js
linearity : Number = 1
```

linearity parameter, only required for CAHVORE

### nearDist

```js
nearDist : Number = 0.085
```

the distance between the camera model and the near plane

### farDist

```js
farDist : Number = 10.0
```

the distance between the camera model and the far plane

### widthSegments

```js
widthSegments : Number = 16
```

the number of segments to create along the x axis (all sides)

### heightSegments

```js
heightSegments : Number = 16
```

the number of segments to create along the x axis (all sides)

## FrustumMesh

Frustum for depicting the view volume of a camera.
This will be transformed using CAHV or CAHVORE settings.

_extends Mesh_

### constructor

```js
constructor( material : Material ) : void
```

### setParameters

```js
setParameters( parameters : CAHVOREOptions ) : void
```

Update the parameters of the CAHVORE frustum geometry.

## LinearFrustumMesh

Create a linear camera frustum facing the -Z axis with X
to the right and Y up.

_extends Mesh_

### setFromProjectionMatrix

```js
setFromProjectionMatrix(
	projectionMatrix : Matrix4, 
	frame : Matrix4, 
	near : Number, 
	far : Number
) : void
```

Updates the linear frustum view based on the provided projection matrix, frame, near, and far values.
