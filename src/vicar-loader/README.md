# vicar-loader

Utility for loading Vicar file data formats as described [here](https://www-mipl.jpl.nasa.gov/external/VICAR_file_fmt.pdf).

# Use

```js
const loader = new VicarLoader();
loader.load( './path/to/file.vicar' ).then( texture => {

	// ... vicar file contents as data texture ...

} );
```

# API

## VicarResult

### .labels

```js
labels : Array<{ isLabelGroup : Boolean, name : String, value : any }>
```

The set of header labels in the file. This includes both the header and EOL extension labels if present.

### .data

```js
data : TypedArray
```

The data of the file in a typed array of the type defined by the `labels.FORMAT` field with the binary prefix data stripped out.

The array is of length `width * height * depth`. If [complex](#VicarResult#complex) is true then the length will be `width * height * depth * 2` to account for the imaginary and real components of the values.

### .width

```js
width : Number
```

The row stride of the image as defined by the `labels.N1` field.

### .height

```js
height : Number
```

The height of the image as defined by the `labels.N2` field.

### .depth

```js
depth : Number
```

The depth of the image as defined by the `labels.N3` field.

### .prefixData

```js
prefixData : Uint8Array
```

The binary prefix data for each row defined at a `Uint8Array`. The array is of length `width * prefixWidth`.

### .prefixWidth

```js
prefixWidth : Number
```

The width of the binary prefix as defined by the `labels.NBB` field.

### .complex

```js
complex : Boolean
```

Whether the values are complex or not as dependent on the `labels.FORMAT` field. This will be `true` if `labels.FORMAT` is `COMP` or `COMPLEX`.

## VicarTextureResult

### .texture

```js
texture : DataTexture
```

The result of the Vicar content as a texture.

## VicarLoader

Three.js implementation of VicarLoaderBase.

_extends VicarLoaderBase_

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
load( url : String, texture : DataTexture = new DataTexture() ) : VicarTextureResult
```

Loads and parses the Vicar file and returns a DataTexture. If a DataTexture is passed into the function the data is applied to it.

### .parse

```js
parse( buffer : Uint8Array | ArrayBuffer, texture : DataTexture = new DataTexture() ) : VicarTextureResult
```

Parses the contents of the given Vicar file and returns a texture with the contents. The content of the arrays is mapped to a 255 bit color value based on the max values.

## VicarLoaderBase

Class for loading and parsing Vicar files.

### .fetchOptions

```js
fetchOptions : Object = { credentials: 'same-origin' }
```

Fetch options for loading the file.

### .load

```js
load( url : String ) : Promise<VicarResult>
```

Loads and parses the Vicar file. The promise resolves with the returned data from the [parse](#VicarLoaderBase#parse) function.

### .parse

```js
parse( buffer : Uint8Array | ArrayBuffer ) : VicarResult
```

Parses the contents of the given Vicar file and returns an object describing the telemetry.
