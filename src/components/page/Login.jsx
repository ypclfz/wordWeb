import React from 'react';
import { hot } from 'react-hot-loader';
import { Fabric } from 'office-ui-fabric-react/lib/Fabric';
import { DefaultButton } from 'office-ui-fabric-react/lib/Button';
import { TextField } from 'office-ui-fabric-react/lib/TextField';
import MessageBar from '@/components/common/MessageBar'
import axios from 'axios'

class Login extends React.Component {
	
	constructor (props) {
		super(props)
		this.state = {
			usernameError: '',
			passwordError: '',
			username: '',
			password: ''
		}
		this.messageBar = React.createRef()
	}

	handleChanged (value, key) {
		this.setState({[key]: value})
	}

	handleLogin = async () => {
		const username = this.state.username
		const password = this.state.password
		let passFlag = true
		if (username === '') {
			passFlag = false
			this.setState({usernameError: '账号不能为空'})
		} else {
			this.setState({usernameError: ''})
		}

		if (password === '') {
			passFlag = false
			this.setState({passwordError: '密码不能为空'})
		} else {
			this.setState({passwordError: ''})	
		}

		if (!passFlag) return false
		try {
			const response = await axios.post(
				'https://zhiquan.hongjianguo.com/api/TokenAuth/Authenticate', 
				{
					usernameOrEmailAddress: username,
					password
				}, 
				{
					headers: {'abp.tenantid': 1}
				}
			)
			console.log(response)
		} catch (e) {
			console.log(e)
			this.messageBar.current.message({type: 'warning', message: '用户名或密码错误'})
		}	
	}

	render () {
		return (
			<Fabric className="login">
				<div style={{textAlign: 'center'}}>
					<img src="/static/img/logo_hjg.png" style={{width: '150px'}}/>
				</div>
				<TextField label="账号" errorMessage={this.state.usernameError} value={this.state.username} onChanged={(value) => {this.handleChanged(value, 'username')}}/>
				<TextField label="密码" type="password" errorMessage={this.state.passwordError} value={this.state.password} onChanged={(value) => {this.handleChanged(value, 'password')}}/>
				<DefaultButton primary={true} onClick={this.handleLogin} style={{marginTop: '10px'}}>
            登陆
        </DefaultButton>
        <MessageBar ref={this.messageBar} />
			</Fabric>
		)
	}
}

export default hot(module)(Login)