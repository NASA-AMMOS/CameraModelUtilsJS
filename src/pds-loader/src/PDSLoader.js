import { VicarLoaderBase } from '../../vicar-loader/src/base/VicarLoaderBase.js';
import { readHeaderString, parseLabels, getFirstLabelInstance } from './utils.js';

/**
 * @typedef {Object} PDSResult
 * @param {Array<{ isLabelGroup: Boolean, name: String, value: any }>} labels
 * The set of header labels in the file. This includes both the header
 * and EOL extension labels if present.
 *
 * @param {(VicarResult|null)} [product=null]
 *
 * The image stored in the file based on the [Vicar loader result](../vicar-loader/README.md#VicarResult).
 *
 * This is present only if there are no product pointers in the header OR if there are only `IMAGE` and
 * `IMAGE_HEADER` objects that point to Vicar data in the same file.
 *
 * @param {Array<VicarResult|null>} [products=null]
 * The set of products pointed to by the header in either this file or separate ones.
 *
 * !> Note this is not currently implemented and separated data products will never be represented here.
 */

// Spec: https://pds.nasa.gov/datastandards/pds3/standards/
/**
 * Class for loading and parsing PDS files.
 */
class PDSLoader {

	constructor() {

		/**
		 * @member {Object}
		 * @description Fetch options for loading the file.
		 * @default { credentials: 'same-origin' }
		 */
		this.fetchOptions = { credentials: 'same-origin' };

	}

	/**
	 * Loads and parses the PDS file. The promise resolves with the returned
	 * data from the {@link #PDSLoader#parse parse} function.
	 * @param {String} url
	 * @returns {Promise<PDSResult>}
	 */
	load( url ) {

		return fetch( url, this.fetchOptions )
			.then( res => {

				if ( ! res.ok ) {

					throw new Error( `PDSLoader: Failed to load file "${url}" with status ${res.status} : ${res.statusText}` );

				}
				return res.arrayBuffer();

			} )
			.then( buffer => this.parse( buffer ) );

	}

	/**
	 * Parses the contents of the given PDS file and returns an object describing
	 * the telemetry.
	 * @param {Uint8Array | ArrayBuffer} buffer
	 * @returns {PDSResult}
	 */
	parse( buffer ) {

		let byteBuffer;
		if ( buffer instanceof Uint8Array ) {

			byteBuffer = buffer;

		} else {

			byteBuffer = new Uint8Array( buffer );

		}

		const headerString = readHeaderString( byteBuffer );
		const labels = parseLabels( headerString );
		const labelRecords = getFirstLabelInstance( labels, 'LABEL_RECORDS', 1 );
		const recordBytes = getFirstLabelInstance( labels, 'RECORD_BYTES' );
		const recordType = getFirstLabelInstance( labels, 'RECORD_TYPE' );
		const labelSize = labelRecords * recordBytes;

		if ( recordType !== 'FIXED_LENGTH' ) {

			console.warn( 'PDSLoader: Non FIXED_LENGTH record types not supported' );
			return Promise.resolve( null );

		}

		const products = [];
		for ( const i in labels ) {

			const { name, value } = labels[ i ];
			if ( /^\^/.test( name ) ) {

				if ( Array.isArray( value ) ) {

					const [ path, index ] = value;

				} else if ( typeof value === 'number' || /<BYTES>/.test( value ) ) {

					let pointer;
					if ( /<BYTES>/.test( value ) ) {

						pointer = value.replace( /<BYTES>/, '' );

					} else {

						pointer = value * recordBytes;

					}

				} else {

					const path = value;

				}

				products.push( {
					name: name.replace( /^\^/, '' ),
					value: null,
				} );

			}

		}

		const result = {};
		result.labels = labels;
		result.product = null;
		result.products = null;

		const noProducts = products.length === 0;
		const justVicarProduct =
			products.length === 2 &&
			getFirstLabelInstance( products, 'IMAGE' ) !== undefined &&
			getFirstLabelInstance( products, 'IMAGE_HEADER' ) !== undefined &&
			typeof getFirstLabelInstance( labels, '^IMAGE' ) === 'number' &&
			typeof getFirstLabelInstance( labels, '^IMAGE_HEADER' ) === 'number' &&
			getFirstLabelInstance( labels, 'IMAGE_HEADER.HEADER_TYPE' ) === 'VICAR2';

		if ( noProducts || justVicarProduct ) {

			if ( getFirstLabelInstance( labels, 'IMAGE_HEADER.HEADER_TYPE' ) === 'VICAR2' ) {

				const loader = new VicarLoaderBase();
				const vicarBuffer = new Uint8Array(
					byteBuffer.buffer,
					byteBuffer.byteOffset + labelSize,
				);
				result.product = loader.parse( vicarBuffer );

			} else {

				console.warn( 'PDSLoader: Could not parse PDS product.' );

			}

		} else {

			result.products = products;
			console.warn(
				'PDSLoader: File contains product pointers which are not yet supported beyond IMAGE and IMAGE_HEADER for Vicar files.',
			);

		}

		return Promise.resolve( result );

	}

}

export { PDSLoader };
