(function($){

	//*********** extend config *********
	try{
		var _config = Ubitus.config || {};
	}catch(e){
		var _config = {};
	}


	//************* Logger ********************
	var _loggerId = new Date().getTime();

	var _logger = function (){
		try{
			for(var i=0;i<arguments.length;i++){
				if(typeof arguments[i] == "object")
					console.log(JSON.stringify(arguments[i]));
				else
					console.log(arguments[i]);
			}
		}catch(e){};
		
		if(!_config.sendJsLog) return;
		_imgLogger.apply(_imgLogger,arguments);
	}

	var _imgLogger = function(){
		var _s = "";
		for(var i=0;i<arguments.length;i++){
			if(i>0) _s += "::";
			_s += JSON.stringify(arguments[i]);
		}
		if(!_s) return;

		var _img = new Image();
		var _src = (_config.server || location.origin)+'/jsLog.jpg?_='+_loggerId+'&msg:' + _s;
		
		_img.src= (_src ).replace(/ /g,"_").replace(/[#<>]/g,"").replace(/["'']/g,"`");	
	}

	$.GamecloudLogger = $.GamecloudLogger || {};
	$.GamecloudLogger.loggerOnMock = $.GamecloudLogger.loggerOnMock || {};
	$.GamecloudLogger.loggerOnMock.log = _logger
	$.GamecloudLogger.loggerOnMock.debug = _logger;
	$.GamecloudLogger.loggerOnMock.error = _logger;
	$.GamecloudLogger.loggerOnMock.info = _logger;
	$.GamecloudLogger.loggerOnMock.warn = _logger;
	//****************************************

	var _ajax = $.ajax;
	$.ajax = function(o){

		//*********** jsessionid *************
		if( o.url.indexOf("logout.action") != -1 || 
			o.url.indexOf("playGame.action") != -1 || 
			o.url.indexOf("bye.action") != -1 ||
			o.url.indexOf("/ugc/cometd") != -1 ){

				if(o.url.indexOf(";jsessionid=") == -1 && $.gamecloud && o.url){
					if($.gamecloud.jsessionid){
						var _urlSplit = o.url.split("?");
						_urlSplit[0] = _urlSplit[0] + ";jsessionid=" + $.gamecloud.jsessionid;
						o.url = _urlSplit.join("?")

					}
				}

				o.xhrFields = o.xhrFields || {};

				//cross domain send cookie
				o.xhrFields.withCredentials = true;
		}

		//************* jsonp ******************
		if( _config.forceJsonp &&
			o.url.indexOf("login.action") != -1 || 
			o.url.indexOf("loginByToken.action") != -1 ||
			o.url.indexOf("loginBySocialNetwork.action") != -1 ||
			o.url.indexOf("logout.action") != -1 ||
			o.url.indexOf("queryPurchaseItems.action") != -1 ||
			o.url.indexOf("queryPrivileges.action") != -1 ||
			o.url.indexOf("purchase.action") != -1 ||
			o.url.indexOf("playGame.action") != -1 || 
			o.url.indexOf("bye.action") != -1 ){
				o.crossDomain  = true;
				o.dataType = 'jsonp' ;
				o.jsonp = 'jsonp';	
		}



		//******** AJAX LOG************************************
		if(_config.sendJsLog){
			if(o.url.indexOf("/ugc/cometd/") == -1){
				_logger("AJAX.request",o.url , o.data);
				(function(){
					var _success = o.success || function(){};
					o.success = function(json){
						_logger("AJAX.success",o.url , json);
						_success(json);
					};

					var _error = o.error  || function(){};
					o.error = function(xhr , textStatus , err){
						_logger("AJAX.error",o.url , err);
						_error(xhr , textStatus , err);
					}
				})();
			}
		}


		//---- force send playGame log ----
		if( o.url.indexOf("playGame.action") != -1 ){
			(function(){
				var _success = o.success || function(){};
				o.success = function(json){
					try{
						_imgLogger("playGameLog",json);
					}catch(e){};
					_success(json);
				}
				
				var _error = o.error  || function(){};
				o.error = function(xhr , textStatus , err){
					_imgLogger("playGameLog.error",o.url , err);
					_error(xhr , textStatus , err);
				}					
			})();
					
		}

		//---- timeout retry AJAX ----
		if( o.url.indexOf("login.action") != -1 || 
			o.url.indexOf("loginByToken.action") != -1 ||
			o.url.indexOf("loginBySocialNetwork.action") != -1 ||
			//o.url.indexOf("/gc_profile_cfg.xml") != -1 ||
			o.url.indexOf("logout.action") != -1 ||
			o.url.indexOf("playGame.action") != -1 || 
			o.url.indexOf("bye.action") != -1 ){

			o.retryLimit =  10;
			o.retry = o.retry || 0;
			o.retryInterval = o.retryInterval || 500;
			
			(function(){
				var _error = o.error  || function(){};
				o.error = function(xhr , textStatus , err){
					if(o.retry < o.retryLimit && err == "timeout"){
						o.retry = o.retry + 1;
						_logger("AJAX.retry "+o.retry+ " time(s).",o.url , err);
						setTimeout(function(){
							_ajax(o);						
						},o.retryInterval);
					}else{
						_imgLogger("playGameLog.error",o.url , err);
						_error(xhr , textStatus , err);					
					}

				}				
			})();						
		}


		//****** send AJAX *******
			return _ajax(o);

	}



	$(function(){

		var _waitingQueue = {};
		var _initialBackData = null;

		
	//*********************************************************************************
	//********   this part is workaround some device player initial not ready  ********
	//*********************************************************************************
		//-- listen initial callback ----
		_config.callback = function(json){
			_initialBackData = json || {};
			_logger("PlayerInitialLog",JSON.stringify(json));
			
			setTimeout(function(){
				if(typeof _waitingQueue["login"]=="function"){
					_logger("waitingQueue execute login !!");
					_waitingQueue["login"]();						
				}
			},100);
		};

	//*********************************************************************************
	//*********************************************************************************
		console.log(_config)
		$.initialGamecloud(_config);
		

		//--hook gamecloud login function--	
		var _oriLogin = $.gamecloud.login;
		var _hookLogin = function(o){
			_logger("execute hook login...");

			//---- reset blocking login ----
			delete _waitingQueue["login"];


			//---- blocking login when player not ready ----
			if(!_initialBackData){
				_logger("player not ready blocking login...");
				_waitingQueue["login"] = function(){ $.gamecloud.login(o); };
				return;
			}

			
			//---- initail fail handling ----
			/*
			if(_initialBackData["code"] != "0"){
				//----- error login callback ----
				o.callback(_initialBackData);
				return;				
			}
			*/


			//---- hook login callback ----
			var _oriCallback = o.callback ;
			o.callback = o.loginCallback = function(json){
				try{
					$.gamecloud.jsessionid = json.data.jsessionid;
				}catch(e){}

				if(_oriCallback)
					_oriCallback(json);
			};

			_oriLogin(o);
		}

		$.gamecloud = $.gamecloud || {};
		$.gamecloud.login = _hookLogin;

	});
	
	

})(jQuery);





/************ Message ************/
var ubitus = ubitus || {};
ubitus.MSG = ubitus.MSG || {};
ubitus.MSG.ERROR = ubitus.MSG.ERROR || {};
ubitus.MSG.ERROR["901"] = { msg : "현재 실행하고 있는 게임이 10분 후 자동 종료됩니다."};
ubitus.MSG.ERROR["902"] = { msg : "게임 이용권이 만료 되었습니다. 계속 이용하시려면 이용권을 구매해주세요."};