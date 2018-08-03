import React from 'react'
import PropTypes from 'prop-types'
import { Label } from 'office-ui-fabric-react/lib/Label'

class AppFormItem extends React.Component {
	constructor (props) {
		super(props)
	}

	render () {
		const rowStyle = {
			marginBottom: '5px',
			display: 'flex'
		}
		const labelStyle = {
			width: this.props.labelWidth,
			textAlign: 'right'
		}
		const contentStyle = {
			flex: 1,
			padding: '5px 0'
		}
		return (
			<div style={rowStyle}>
				<Label style={labelStyle}>{this.props.label}</Label>
				<div style={contentStyle}></div>
			</div>
		)
	}
}
AppFormItem.defaultProps = {
	label: '',
	labelWidth: ''
}
AppFormItem.propTypes = {
	label: PropTypes.string,
	labelWidth: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.number
	])
}
export default AppFormItem
