# PGM Loader

A class in the same form as the three.js loaders for loading and parsing PGM images ([ref 1](http://netpbm.sourceforge.net/doc/pgm.html), [ref 2](https://people.sc.fsu.edu/~jburkardt/data/pgma/pgma.html)).

# Use

```js
const loader = new PGMLoader();
loader.load( 'path/to/file.pgm', array => {

    // ... loaded data ...

} );
```

# API

## PGMResult

### .data

```js
data : Uint16Array | Uint8Array
```

The PGM laid out in an array in row major order where each row has a stride of `width`.

### .width

```js
width : Number
```

The width of the pgm file in pixels.

### .height

```js
height : Number
```

The height of the pgm file in pixels.

### .maxValue

```js
maxValue : Number
```

The maximum gray value in the file.

## PGMLoaderBase

Class for loading and parsing PGM image files

### .fetchOptions

```js
fetchOptions : Object = { credentials: 'same-origin' }
```

Fetch options for loading the file.

### .load

```js
load( url : String ) : Promise<PGMResult>
```

Loads and parses the PGM file. The promise resolves with the returned
data from the [parse](#PGMLoader#parse) function.

### .parse

```js
parse( buffer : ArrayBuffer ) : PGMResult
```

Parses the contents of the given PGM and returns an object describing
the telemetry.

## PGMLoader

Three.js implementation of PGMLoaderBase.

_extends PGMLoaderBase_

### .manager

```js
manager : LoadingManager = DefaultLoadingManager
```

### .constructor

```js
constructor( manager : LoadingManager = DefaultLoadingManager ) : void
```

### .load

```js
load( url : String, texture : DataTexture = new DataTexture() ) : DataTexture
```

Loads and parses the PGM file and returns a DataTexture. If a DataTexture is passed into
the function the data is applied to it.

### .parse

```js
parse( buffer : Uint8Array | ArrayBuffer, texture : DataTexture = new DataTexture() ) : DataTexture
```

Parses the contents of the given PGM file and returns a texture with the
contents.
