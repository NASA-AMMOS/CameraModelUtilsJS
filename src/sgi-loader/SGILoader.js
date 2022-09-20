import { SGILoaderBase } from './SGILoaderBase.js';
import {
	DataTexture,
	RGBAFormat,
	RGFormat,
	RedFormat,
	UnsignedByteType,
	UnsignedShortType,
	LinearFilter,
	LinearMipmapLinearFilter,
	DefaultLoadingManager,
	sRGBEncoding,
	LinearEncoding,
} from 'three';

/**
 * A three.js implementation of SGILoader that returns a data texture rather than raw results.
 */
export class SGILoader extends SGILoaderBase {

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
	 * Loads and parses the SGI file and returns a DataTexture. If a DataTexture is passed into
	 * the function the data is applied to it.
	 * @param {String} url
	 * @param {DataTexture} texture
	 * @returns {DataTexture}
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
	 * Parses the contents of the given SGI contents and returns a texture.
	 * @param {ArrayBuffer|Uint8Array} buffer
	 * @param {DataTexture} texture
	 * @returns {DataTexture}
	 */
	parse( buffer, texture = new DataTexture() ) {

		let result = buffer;
		if ( buffer instanceof ArrayBuffer ) {

			result = super.parse( buffer );

		}

		texture.image.width = result.width;
		texture.image.height = result.height;
		texture.image.data = result.data;
		texture.generateMipmaps = true;
		texture.minFilter = LinearMipmapLinearFilter;
		texture.magFilter = LinearFilter;
		texture.type = result.data.BYTES_PER_ELEMENT === 1 ? UnsignedByteType : UnsignedShortType;
		texture.encoding = result.data.BYTES_PER_ELEMENT === 1 ? sRGBEncoding : LinearEncoding;

		switch ( result.channels ) {

			case 1:
				texture.format = RedFormat;
				break;
			case 2:
				texture.format = RGFormat;
				break;
			case 3: {

				// three.js does not support RGBFormat so convert the data to
				// 4 channel data.
				const { width, height, data } = result;
				const newData = new data.constructor( width * height * 4 );
				const maxValue = Math.pow( 2, newData.BYTES_PER_ELEMENT * 8 );
				for ( let i = 0, l = width * height; i < l; i ++ ) {

					const i3 = 3 * i;
					const i4 = 4 * i;
					newData[ i4 + 0 ] = data[ i3 + 0 ];
					newData[ i4 + 1 ] = data[ i3 + 1 ];
					newData[ i4 + 2 ] = data[ i3 + 2 ];
					newData[ i4 + 3 ] = maxValue;

				}

				texture.format = RGBAFormat;
				texture.image.data = newData;
				break;

			}

			case 4:
				texture.format = RGBAFormat;
				break;

		}

		texture.needsUpdate = true;

		return texture;

	}

}
