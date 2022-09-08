import { PGMLoaderBase } from '../base/PGMLoaderBase.js';
import {
	DataTexture,
	DefaultLoadingManager,
	UnsignedByteType,
	HalfFloatType,
	sRGBEncoding,
	LuminanceFormat,
	LinearFilter,
	LinearMipMapLinearFilter,
} from 'three';

/**
 * Three.js implementation of PGMLoaderBase.
 */
export class PGMLoader extends PGMLoaderBase {

	/**
     * @param {LoadingManager} manager
     */
	constructor( manager = DefaultLoadingManager ) {

		super();

		/**
         * @member {LoadingManager}
         * @default DefaultLoadingManager
         */
		this.manager = manager;

	}

	/**
     * Loads and parses the PGM file and returns a DataTexture. If a DataTexture is passed into
     * the function the data is applied to it.
     * @param {String} url
     * @param {DataTexture} texture
     * @returns {DataTexture}
     */
	load( url, texture = new DataTexture() ) {

		const manager = this.manager;
		manager.itemStart( url );
		super.load( url ).then( result => {

			texture.copy( result );
			texture.needsUpdate = true;

		} ).catch( err => {

			manager.itemError( url, err );

		} ).finally( () => {

			manager.itemEnd( url );

		} );
		return texture;

	}

	/**
     * Parses the contents of the given PGM file and returns a texture with the
     * contents.
     * @param {Uint8Array | ArrayBuffer} buffer
     * @param {DataTexture} texture
     * @returns {DataTexture}
     */
	parse( buffer, texture = new DataTexture() ) {

		let result = buffer;
		if ( buffer instanceof ArrayBuffer || buffer instanceof Uint8Array ) {

			result = super.parse( buffer );

		}

		// TODO: if type if HalfFloatType then do the values need to be normalized by maxValue?
		texture.image.width = result.width;
		texture.image.height = result.height;
		texture.image.data = result.data;
		texture.minFilter = LinearMipMapLinearFilter;
		texture.magFilter = LinearFilter;
		texture.type = result.data.BYTES_PER_ELEMENT === 1 ? UnsignedByteType : HalfFloatType;
		texture.encoding = sRGBEncoding;
		texture.format = LuminanceFormat;
		texture.flipY = true;
		texture.generateMipmaps = true;
		texture.needsUpdate = true;

		return texture;

	}

}

