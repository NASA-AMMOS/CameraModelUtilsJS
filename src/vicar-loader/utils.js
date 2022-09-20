// Parse label values into numbers, strings, or arrays
function parseValue( val ) {

	val = val.trim();
	if ( val[ 0 ] === '(' ) {

		const tokens = val.replace( /[()]/g, '' ).split( /,/g );
		return tokens.map( v => parseValue( v ) );

	} else if ( val[ 0 ] === '\'' ) {

		return val.substring( 1, val.length - 1 ).replace( /''/g, '\'' );

	} else {

		return Number( val );

	}

}

function consumeString( string, i ) {

	let token = string[ i ];
	while ( true ) {

		i ++;
		const c = string[ i ];

		token += c;

		if ( c === '\'' ) {

			if ( string[ i + 1 ] === '\'' ) {

				token += '\'';
				i ++;

			} else {

				break;

			}

		}

	}

	return { token, index: i };

}

function consumeArray( string, i ) {

	let token = string[ i ];
	while ( true ) {

		i ++;

		const c = string[ i ];
		if ( c === '\'' ) {

			const info = consumeString( string, i );
			token += info.token;
			i = info.index;

		} else if ( c === ')' ) {

			token += c;
			break;

		} else {

			token += c;

		}

	}

	return { token, index: i };

}

// Parse the list of labels into an object
function parseLabels( string ) {

	const tokens = [];
	let lastToken = '';
	for ( let i = 0, l = string.length; i < l; i ++ ) {

		let c = string[ i ];
		if ( c === '=' || c === ' ' ) {

			if ( lastToken.trim() !== '' ) {

				tokens.push( lastToken );

			}

			lastToken = '';

		} else if ( c === '\'' ) {

			const { token, index } = consumeString( string, i );
			i = index;
			lastToken += token;

		} else if ( c === '(' ) {

			const { token, index } = consumeArray( string, i );
			i = index;
			lastToken += token;

		} else {

			lastToken += c;

		}

	}

	if ( lastToken.trim() !== '' ) {

		tokens.push( lastToken );

	}

	const labels = [];
	for ( let i = 0, l = tokens.length; i < l; i += 2 ) {

		const name = tokens[ i ].trim();
		const val = parseValue( tokens[ i + 1 ].trim() );
		labels.push( {
			name, value: val,
		} );

	}

	return labels;

}

// Read string from buffer from index "from" to "to"
function readString( buffer, from, to ) {

	let str = '';
	for ( let i = from; i < to; i ++ ) {

		const value = String.fromCharCode( buffer[ i ] );
		if ( value === '\0' ) {

			break;

		}

		str += value;

	}

	return str;

}

// Read string from buffer until "cb" returns true
function readUntil( buffer, from, cb ) {

	let str = '';
	for ( let i = from; i < buffer.length; i ++ ) {

		const c = String.fromCharCode( buffer[ i ] );

		if ( cb( c ) ) {

			break;

		} else {

			str += c;

		}

	}

	return str;

}

function getFirstLabelInstance( labels, name, defaultValue ) {

	const label = labels.find( l => l.name === name );
	return label ? label.value : defaultValue;

}

export { readUntil, parseLabels, readString, getFirstLabelInstance };
