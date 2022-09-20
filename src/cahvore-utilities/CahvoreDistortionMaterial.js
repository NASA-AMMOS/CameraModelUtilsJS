import { ShaderMaterial } from 'three';
import { cahvoreUnprojectShader, CAHV, CAHVOR, CAHVORE } from './shader/cahvoreDistortionShader.js';
import { getLinearFrustumInfo, frameBoundsToProjectionMatrix } from './utils.js';

export class CahvoreDistortionMaterial extends ShaderMaterial {

	get checkerboard() {

		return Boolean( this.defines.CHECKERBOARD );

	}
	set checkerboard( value ) {

		const v = Number( value );
		if ( this.defines.CHECKERBOARD !== v ) {

			this.defines.CHECKERBOARD = v;
			this.needsUpdate = true;

		}

	}

	get passthrough() {

		return Boolean( this.defines.PASSTHROUGH );

	}
	set passthrough( value ) {

		const v = Number( value );
		if ( this.defines.PASSTHROUGH !== v ) {

			this.defines.PASSTHROUGH = v;
			this.needsUpdate = true;

		}

	}

	constructor( parameters ) {

		super( cahvoreUnprojectShader );

		[ 'C', 'A', 'H', 'V', 'O', 'R', 'E', 'maxFoV', 'inverseFrame', 'cahvoreProjectionMatrix' ]
			.forEach( key => {

				Object.defineProperty( this, key, {
					get() {

						return this.uniforms[ key ].value;

					},
				} );

			} );

		[ 'imageWidth', 'imageHeight', 'linearity' ]
			.forEach( key => {

				Object.defineProperty( this, key, {
					get() {

						return this.uniforms[ key ].value;

					},
					set( v ) {

						this.uniforms[ key ].value = v;

					},
				} );

			} );

		Object.defineProperty( this, 'map', {
			get() {

				return this.uniforms[ 'map' ].value;

			},
			set( v ) {

				if ( this.uniforms[ 'map' ] === null ) {

					this.needsUpdate = true;

				}

				this.uniforms[ 'map' ].value = v;

			},
		} );

		this.setValues( parameters );

	}

	setModelType( modelType ) {

		if ( typeof modelType === 'string' ) {

			switch ( modelType.toLowerCase() ) {

				case 'cahv':
					this.setModelType( CAHV );
					break;
				case 'cahvor':
					this.setModelType( CAHVOR );
					break;
				case 'cahvore':
					this.setModelType( CAHVORE );
					break;
				default:
					throw new Error( `CahvoreDistortionMaterial: Camera model type ${ modelType } not supported` );

			}

		} else {

			const defines = this.defines;
			if ( defines.MODEL_TYPE !== modelType ) {

				this.needsUpdate = true;

			}

			defines.MODEL_TYPE = modelType;

		}

	}

	setFromCameraModel( model ) {

		this.setModelType( model.type );
		this.C.copy( model.C );
		this.A.copy( model.A );
		this.H.copy( model.H );
		this.V.copy( model.V );
		if ( model.O ) this.O.copy( model.O );
		if ( model.R ) this.R.copy( model.R );
		if ( model.E ) this.E.copy( model.E );

		this.imageWidth = model.width;
		this.imageHeight = model.height;
		this.linearity = model.linearity;

		const info = getLinearFrustumInfo( model );
		const { maxFrameBounds, frame } = info;
		this.inverseFrame.copy( frame ).invert();

		frameBoundsToProjectionMatrix( maxFrameBounds, 1.0, 2.0, this.cahvoreProjectionMatrix );

	}

}
