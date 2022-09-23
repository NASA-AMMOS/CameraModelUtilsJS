
export function addLabelToGUI( folder, labels ) {

	for ( let i = 0, l = labels.length; i < l; i ++ ) {

		const label = labels[ i ];
		if ( ! ( label instanceof Object ) ) {

			folder.add( { value: label }, 'value' ).name( `${ i }:` ).disable();

		} else if ( Array.isArray( label.value ) ) {

			const newFolder = folder.addFolder( label.name );
			newFolder.close();
			addLabelToGUI( newFolder, label.value );

		} else {

			folder.add( label, 'value' ).name( label.name ).disable();

		}

	}

}

export function findTextureValueExtremes( tex ) {

	const { width, height, data } = tex.image;
	let min = Infinity;
	let max = - Infinity;

	for ( let i = 0, l = width * height; i < l; i ++ ) {

		for ( let c = 0; c < 3; c ++ ) {

			const v = data[ i * 4 + c ];
			min = Math.min( min, v );
			max = Math.max( max, v );

		}

	}

	return { min, max };

}

export function stretchTextureData( tex ) {

	const { min, max } = findTextureValueExtremes( tex );
	const { data } = tex.image;

	const maxIntValue = 2 ** ( data.BYTES_PER_ELEMENT * 8 );
	const minFloat = min / maxIntValue;
	const maxFloat = max / maxIntValue;
	const floatRange = maxFloat - minFloat;
	for ( let i = 0, l = data.length; i < l; i ++ ) {

		const value = data[ i ] / maxIntValue;
		const mappedValue = ( value - minFloat ) / floatRange;
		data[ i ] = Math.max( 0.0, mappedValue * maxIntValue );

	}

}
