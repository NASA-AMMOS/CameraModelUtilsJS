# PDS Loader

Utility for loading PDS file data formats as described [here](https://pds.nasa.gov/datastandards/pds3/standards/). Example files available [here](https://pds.nasa.gov/datastandards/documents/examples/).

> **Note**
> Note that this package is built to support specific downlink products and does not support the whole PDS spec as a result. The loader can be expanded as needed.

> **Warning**
> This loader is still in progress.

# Use

```js
const loader = new PDSLoader();
loader.load( './path/to/file.vicar' ).then(res => {

	// ... pds file contents ...

} );
```

# API

## PDSResult

### .labels

```js
labels : Array<{ isLabelGroup : Boolean, name : String, value : any }>
```

The set of header labels in the file. This includes both the header and EOL extension labels if present.

### .product

```js
product : VicarResult | null = null
```

The image stored in the file based on the `Vicar loader result`.

This is present only if there are no product pointers in the header OR if there are only `IMAGE` and `IMAGE_HEADER` objects that point to Vicar data in the same file.

### .products

```js
products : Array<VicarResult | null> = null
```

The set of products pointed to by the header in either this file or separate ones.

> **Note**
> Note this is not currently implemented and separated data products will never be represented here.

## PDSLoader

Class for loading and parsing PDS files.

### .fetchOptions

```js
fetchOptions : Object = { credentials: 'same-origin' }
```

Fetch options for loading the file.

### .load

```js
load( url : String ) : Promise<PDSResult>
```

Loads and parses the PDS file. The promise resolves with the returned data from the [parse](#PDSLoader#parse) function.

### .parse

```js
parse( buffer : Uint8Array | ArrayBuffer ) : PDSResult
```
Parses the contents of the given PDS file and returns an object describing the telemetry.
