import { PGMLoaderBase } from './PGMLoaderBase.js';
import {
	DataTexture,
	DefaultLoadingManager,
	UnsignedByteType,
	HalfFloatType,
	sRGBEncoding,
	LinearFilter,
	LinearMipMapLinearFilter,
	RGBAFormat,
	LinearEncoding,
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
	 * @returns {Promise<DataTexture>}
	 */
	load( url, texture = new DataTexture() ) {

		const manager = this.manager;
		manager.itemStart( url );
		return super.load( url ).then( result => {

			texture.copy( result );
			texture.needsUpdate = true;
			return texture;

		} ).catch( err => {

			manager.itemError( url, err );
			throw err;

		} ).finally( () => {

			manager.itemEnd( url );

		} );

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

		const data = result.data;
		const rgbaBuffer = new data.constructor( data.length * 4 );
		for ( let i = 0, l = data.length; i < l; i ++ ) {

			const v = data[ i ];
			rgbaBuffer[ i * 4 + 0 ] = v;
			rgbaBuffer[ i * 4 + 1 ] = v;
			rgbaBuffer[ i * 4 + 2 ] = v;
			rgbaBuffer[ i * 4 + 3 ] = 1;

		}

		// TODO: if type if HalfFloatType then do the values need to be normalized by maxValue?
		texture.image.width = result.width;
		texture.image.height = result.height;
		texture.image.data = rgbaBuffer;
		texture.minFilter = LinearMipMapLinearFilter;
		texture.magFilter = LinearFilter;
		texture.type = result.data.BYTES_PER_ELEMENT === 1 ? UnsignedByteType : HalfFloatType;
		texture.encoding = result.data.BYTES_PER_ELEMENT === 1 ? sRGBEncoding : LinearEncoding;
		texture.format = RGBAFormat;
		texture.flipY = true;
		texture.generateMipmaps = true;
		texture.needsUpdate = true;

		return texture;

	}

}

