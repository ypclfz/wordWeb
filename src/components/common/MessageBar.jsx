import React from 'react'
import { MessageBar as Bar, MessageBarType } from 'office-ui-fabric-react/lib/MessageBar'
import '@/css/messageBar.css'

class MessageBar extends React.Component {
	constructor (props) {
		super(props)
		this.state = {
			viewIf: false, // 是否初始化
			viewShow: false, // 是否显示
			message: '', // 提示信息
			messageType: '' // 提示类型
		}
	}

	message ({message, type}) {
    if (!this.state.viewIf) {
    	this.setState({viewIf: true})
    }

    this.setState({
  		message,
  		messageType: type,
  		viewShow: true
  	})

    window.setTimeout(() => {
      this.setState({viewShow: false})
    }, 2000)
  }

	render () {
    const message = this.state.viewIf ? (
      <div className="message" style={{display: this.state.viewShow ? 'block' : 'none'}}>
        <Bar 
          className={this.state.messageType === 'warning' ? 'ms-MessageBar-content-warning' : 'ms-MessageBar-content-success'} 
          messageBarType={MessageBarType[this.state.messageType]}>
          {this.state.message}
        </Bar>
      </div>
    ) : ''

    return message
	}

}

export default MessageBar
