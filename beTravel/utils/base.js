/**
 * Author : 丸子团队（波波、Chi、ONLINE.信）
 * Github 地址: https://github.com/dchijack/Travel-Mini-Program
 * GiTee 地址： https://gitee.com/izol/Travel-Mini-Program
 */

const API_HOST = 'https://www.euyyue.com'  // 更换为你的网站域名, 需要有 https 协议
const Auth = require('./auth')
 
const API = {}

API.getHost = function(){
	return API_HOST;
}

API.request = function(url, method = "GET", data={}, args = { token: true }) {
	
	return new Promise(function(resolve, reject) {
		
		url = API_HOST + url;
		
		if (args.token) {
			const token = API.token();
			if(token) {
				if(url.indexOf("?")>0) {
					url = url + '&access_token=' + token;
				} else {
					url = url + '?access_token=' + token;
				}
			} else {
				console.warn('[提示]','部分数据需要授权，检测出当前访问用户未授权登录小程序');
			}
		}
		console.log(url)
		console.log(data)
		swan.request({
			url: url,
			data: data,
			method: method,
			success: function(res) {
				console.log(res);
				if(res.statusCode == 200) {
					resolve(res.data);
				} else if(res.data.code === "rest_post_invalid_page_number") {
					swan.showToast({
						title: '没有更多内容',
						mask: false,
						duration: 1000
					});
				} else {
					swan.showToast({
						title: "请求数据失败",
						duration: 1500
					});
					console.log(res.data.message);
					reject(res.data);
				}
			},
			fail: function(err) {
				console.log(err);
				reject(err);
			}
		})
	});
	
}

API.get = function(url, data={}, args = { token: false }) {
	return API.request(url, "GET", data, args);
}

API.post = function(url, data, args = { token: true }) {
	return API.request(url, "POST", data, args);
}

API.getUser = function(){
	if(Auth.check()){
		return Auth.user();
	}else{
		return false;
	}
	
}

API.login = function() {
	return new Promise(function(resolve, reject) {
		if(Auth.check()){
			resolve(Auth.user());
		}else{
			resolve(Auth.login());
		}
	});
}

API.logout = function() {
	let logout = Auth.logout();
	if(logout) {
		getApp().globalData.user = '';
		swan.reLaunch({
			url: '/pages/index/index'
		})
	} else {
		swan.showToast({
			title: '注销失败!',
			icon: 'warn',
			duration: 1000,
		})
	}
}

API.getUserInfo = function() {
	return new Promise(function(resolve, reject) {
		Auth.getUserInfo().then(data=>{
			API.post('/wp-json/mp/v1/baidu/login', data, { token: false }).then(res => {
				API.storageUser(res);
				console.log(res);
				resolve(res.user);
			}, err => {
				reject(err);
			});
		})
		.catch( err =>{
			reject(err);
		})
	});
}

API.token = function() {
	let token = Auth.token();
	let datetime = Date.now();
	if(token && datetime < swan.getStorageSync('expired_in')) {
		return token;
	} else {
		return false;
	}
}

API.storageUser = function(res) {
	getApp().globalData.user = res.user;
	swan.setStorageSync('user', res.user);
	swan.setStorageSync('openid', res.openid);
	if(res.access_token){
		swan.setStorageSync('token', res.access_token);
		swan.setStorageSync('expired_in', Date.now() + parseInt(res.expired_in, 10) * 100000 - 60000);
	}
}

 /**
 * 需要授权的接口调用
 * @param	{Function} fn
 * @return {Promise}
 */
API.guard = function(fn) {
	const self = this
	return function() {
		if(API.getUser()) {
			return fn.apply(self, arguments)
		} else {
			return API.getUserInfo().then(res => {
				console.log('登录成功', res);
				return fn.apply(self, arguments)
			}, err => {
				console.log('登录失败', err);
				return err
			})
		}
	}
}

module.exports = API