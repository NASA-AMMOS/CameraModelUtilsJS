// The spec:
// http://paulbourke.net/dataformats/sgirgb/
// http://paulbourke.net/dataformats/sgirgb/sgiversion.html
// https://www.fileformat.info/format/sgiimage/egff.htm

// reads a data view as a string up to max length, ending at the terminating character
function readUpTo( dataView, offset = 0, maxLength = Infinity ) {

	let str = '';
	let currOffset = offset;
	while ( dataView.getUint8( currOffset ) !== 0 && currOffset - offset < maxLength ) {

		str += String.fromCharCode( DataView.getUint8( currOffset ) );
		currOffset ++;

	}
	return str;

}

/**
 * @typedef {Object} SGIResult
 *
 * @param {String} name
 * The image name embedded in the file.
 *
 * @param {Boolean} rle
 * Whether the file is run length encoded or not.
 *
 * @param {Number} dimension
 * The number of dimensions to the stored data.
 *
 * @param {Number} width
 * The width of the sgi file in pixels.
 *
 * @param {Number} height
 * The height of the sgi file in pixels.
 *
 * @param {Number} channels
 * The number of color channels stored in the image.
 *
 * @param {Number} minValue
 * The minimum channel value in the file.
 *
 * @param {Number} maxValue
 * The maximum channel value in the file.
 *
 * @param {Number} bytesPerChannel
 * The amount of bytes used to represent a single color channel.
 *
 * @param {Uint16Array|Uint8Array} data
 * The SGI laid out in an array in row major order where each row has a stride
 * of `width * channels * bytesPerChannel`.
 */

/** Class for loading Silicon Graphics Image files */
export class SGILoaderBase {

	constructor() {

		/**
         * @member {Object}
         * @description Fetch options for loading the file.
         * @default { credentials: 'same-origin' }
         */
		this.fetchOptions = { credentials: 'same-origin' };

	}

	/**
     * Loads and parses the SGI file. The promise resolves with the returned
     * data from the {@link #SGILoaderBase#parse parse} function.
     * @param {String} url
     * @returns {Promise<SGIResult>}
     */
	load( url ) {

		return fetch( url, this.fetchOptions )
			.then( res => {

				if ( ! res.ok ) {

					throw new Error( `SGILoader: Failed to load file "${url}" with status ${res.status} : ${res.statusText}` );

				}
				return res.arrayBuffer();

			} )
			.then( buffer => this.parse( buffer ) );

	}

	/**
     * Parses the contents of the given SGI contents and returns an object describing
     * the telemetry.
     * @param {ArrayBuffer|Uint8Array} buffer
     * @returns {SGIResult}
     */
	parse( buffer ) {

		const HEADER_LENGTH = 512;
		let dataView;
		let uint8Buffer;
		if ( buffer instanceof ArrayBuffer ) {

			dataView = new DataView( buffer );
			uint8Buffer = new Uint8Array( buffer );

		} else {

			dataView = new DataView( buffer.buffer, buffer.byteOffset, buffer.byteLength );
			uint8Buffer = new Uint8Array( buffer.buffer, buffer.byteOffset, buffer.byteLength );

		}

		// read header
		const magic = dataView.getUint16( 0, false );
		if ( magic !== 474 ) {

			throw new Error( `SGILoader : Magic bytes set to ${magic}. Expected 474.` );

		}

		const storage = dataView.getUint8( 2 );
		const bytesPerChannel = dataView.getUint8( 3 );

		const dimension = dataView.getUint16( 4, false );
		const width = dataView.getUint16( 6, false );
		const height = dataView.getUint16( 8, false );
		const channels = dataView.getUint16( 10, false );

		const minValue = dataView.getInt32( 12, false );
		const maxValue = dataView.getInt32( 16, false );

		// 4 0 bytes

		const name = readUpTo( dataView, 20, 80 );
		const colorMap = dataView.getInt32( 100, false );

		if ( colorMap !== 0 ) {

			throw new Error( `SGILoader : Obsolete colormap value ${colorMap} found.` );

		}

		// read image
		const imageLength = width * height * channels * bytesPerChannel;
		let data;
		let source;
		if ( bytesPerChannel === 2 ) {

			data = new Uint16Array( imageLength / 2 );
			source = new Uint16Array( uint8Buffer.buffer, uint8Buffer.byteOffset );

		} else {

			data = new Uint8Array( imageLength );
			source = uint8Buffer;

		}

		// RLE
		if ( storage === 1 ) {

			if ( bytesPerChannel === 2 ) {

				console.warn( 'SGILoader: RLE 2 bytes per channel files have not been tested.' );

			}
			const data8Buffer = new Uint8Array( data.buffer, data.byteOffset, data.byteLength );
			const count = height * channels;
			for ( let c = 0; c < channels; c ++ ) {

				for ( let r = 0; r < height; r ++ ) {

					const rowIndex = c * height + r;
					const start = dataView.getInt32( HEADER_LENGTH + rowIndex * 4, false );
					const length = dataView.getInt32(
						HEADER_LENGTH + count * 4 + rowIndex * 4,
						false,
					);
					const end = start + length;

					let targetOffset = r * width * channels * bytesPerChannel + c;
					let offset = start;
					while ( offset < end ) {

						let color = source[ offset ];
						offset ++;
						let count = color & 0x7f; // bits 0-6
						if ( count == 0 ) {

							// end of the row
							break;

						} else if ( color & 0x80 ) {

							// read upcoming characters
							while ( count -- ) {

								data8Buffer[ targetOffset ] = source[ offset ];
								targetOffset += channels;
								offset ++;

							}

						} else {

							// repeat an existing value
							color = source[ offset ];
							offset ++;
							while ( count -- ) {

								data8Buffer[ targetOffset ] = color;
								targetOffset += channels;

							}

						}

					}

				}

			}

		} else {

			for ( let c = 0; c < channels; c ++ ) {

				// the length of data for images before the current channel
				const imageOffset = HEADER_LENGTH + width * height * c;
				for ( let y = 0; y < height; y ++ ) {

					const sourceOffset = imageOffset + y * width;
					const targetOffset = width * channels * y;
					for ( let x = 0; x < width; x ++ ) {

						const sourceIndex = sourceOffset + x;
						const targetIndex = targetOffset + x * channels + c;

						data[ targetIndex ] = source[ sourceIndex ];

					}

				}

			}

		}

		return {
			name,
			rle: storage === 1.0,

			dimension,
			width,
			height,
			channels,

			minValue,
			maxValue,
			bytesPerChannel,

			data,
		};

	}

}
