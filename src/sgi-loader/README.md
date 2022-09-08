# SGI Loader

A class in the same form as the three.js loaders for loading and parsing [SGI images](http://paulbourke.net/dataformats/sgirgb/).

!> Note that RLE parsing for 2 byte per channel images is untested.

# Use

```js
const loader = new SGILoader();
loader
    .load( 'path/to/file.rgb' )
    .then( texture => {

        // ... loaded three.js texture ...

    } );
```

# API

## SGIResult

### name

```js
name : String
```

The image name embedded in the file.

### rle

```js
rle : Boolean
```

Whether the file is run length encoded or not.

### dimension

```js
dimension : Number
```

The number of dimensions to the stored data.

### width

```js
width : Number
```

The width of the sgi file in pixels.

### height

```js
height : Number
```

The height of the sgi file in pixels.

### channels

```js
channels : Number
```

The number of color channels stored in the image.

### minValue

```js
minValue : Number
```

The minimum channel value in the file.

### maxValue

```js
maxValue : Number
```

The maximum channel value in the file.

### bytesPerChannel

```js
bytesPerChannel : Number
```

The amount of bytes used to represent a single color channel.

### data

```js
data : Uint16Array | Uint8Array
```

The SGI laid out in an array in row major order where each row has a stride
of `width * channels * bytesPerChannel`.

## SGILoaderBase

Class for loading Silicon Graphics Image files

### fetchOptions

```js
fetchOptions : Object = { credentials: 'same-origin' }
```

Fetch options for loading the file.

### load

```js
load( url : String ) : Promise<SGIResult>
```

Loads and parses the SGI file. The promise resolves with the returned
data from the [parse](#SGILoaderBase#parse) function.

### parse

```js
parse( buffer : ArrayBuffer | Uint8Array ) : SGIResult
```

Parses the contents of the given SGI contents and returns an object describing
the telemetry.

## SGILoader

A three.js implementation of SGILoader that returns a data texture rather than raw results.

_extends SGILoaderBase_

### manager

```js
manager : LoadingManager = DefaultLoadingManager
```

### constructor

```js
constructor( manager : LoadingManager = DefaultLoadingManager ) : void
```

### load

```js
load( url : String, texture : DataTexture = new DataTexture() ) : DataTexture
```

Loads and parses the SGI file and returns a DataTexture. If a DataTexture is passed into
the function the data is applied to it.

### parse

```js
parse( buffer : ArrayBuffer | Uint8Array, texture : DataTexture = new DataTexture() ) : DataTexture
```

Parses the contents of the given SGI contents and returns a texture.
