import { VicarLoaderBase } from '../base/VicarLoaderBase.js';
import { DataTexture, RGBAFormat, DefaultLoadingManager, LinearFilter, LinearMipMapLinearFilter } from 'three';

/**
 * Three.js implementation of VicarLoaderBase.
 */
export class VicarLoader extends VicarLoaderBase {

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
	 * Loads and parses the Vicar file and returns a DataTexture. If a DataTexture is passed into
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
	 * Parses the contents of the given Vicar file and returns a texture with the
	 * contents. The content of the arrays is mapped to a 255 bit color value
	 * based on the max values.
	 * @param {Uint8Array | ArrayBuffer} buffer
	 * @param {DataTexture} texture
	 * @returns {DataTexture}
	 */
	parse( buffer, texture = new DataTexture() ) {

		let result = buffer;
		if ( buffer instanceof ArrayBuffer ) {

			result = super.parse( buffer );

		}

		// find the min and max value
		let max = - Infinity;
		const stride = result.width * result.height;
		for ( let i = 0; i < stride; i ++ ) {

			const r = result.data[ stride * 0 + i ];
			const g = result.data[ stride * 1 + i ];
			const b = result.data[ stride * 2 + i ];
			max = Math.max( max, r, g, b );

		}

		// Assume BSQ organization
		const ORG = result.labels.find( label => label.name === 'ORG' ).value;
		if ( ORG !== 'BSQ' ) {

			throw new Error( 'VicarLoader: File is not in BSQ order which is the only supported organization for the file at the moment.' );

		}

		let maxValue = max;
		if ( ! ( result.data instanceof Float32Array ) || ! ( result.data instanceof Float64Array ) ) {

			const usefulBits = Math.ceil( Math.log( max ) / Math.LN2 );
			maxValue = 2 ** usefulBits;

		} else if ( result.data instanceof Uint8Array ) {

			maxValue = 255;

		}

		const data = new Uint8ClampedArray( stride * 4 );
		for ( let i = 0; i < stride; i ++ ) {

			const r = result.data[ stride * 0 + i ] / maxValue;
			const g = result.data[ stride * 1 + i ] / maxValue;
			const b = result.data[ stride * 2 + i ] / maxValue;
			data[ i * 4 + 0 ] = r * 255;
			data[ i * 4 + 1 ] = g * 255;
			data[ i * 4 + 2 ] = b * 255;
			data[ i * 4 + 3 ] = 255;

		}

		// Vicar files always have 3 dimensions
		texture.image.width = result.width;
		texture.image.height = result.height;
		texture.image.data = data;
		texture.minFilter = LinearMipMapLinearFilter;
		texture.magFilter = LinearFilter;
		texture.format = RGBAFormat;
		texture.flipY = true;
		texture.generateMipmaps = true;
		texture.needsUpdate = true;

		return texture;

	}

}
