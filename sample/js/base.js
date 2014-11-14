$(function(){
	// _data[0] = jabber account
	// _data[1] = jabber password
	// _data[2] = gameId
	var _data = !location.search ? [] : (function(){
		var _search = location.search;
		_search.indexOf("?")=== 0 && (_search = _search.substr(1));
		return _search.split("/");
	})();

	var _userId = _data[0];
	var _userPWD = _data[1];
	var _gameId = _data[2];

	var _config = Ubitus.config || {};

	var _play = function(){
		$(".str").html("Launch game... "+_gameId);
		var _property = {};
			_property.supportSave = _config.supportSave;

		$.gamecloud.play({
			gameId :  _gameId,
			properties : _property,
			callback : function(json){
				if(json.code == "302")
					_autoPurchase();
				else if(json.code !== '0'){
					alert('Launch game failed\n'+json.code+":"+json.message);
					_closeWindow();
				}
					
			},
			playerStatusCallback : function(json){
				if(json.code == "6302" || json.code == "6303"){
					_closeWindow();
				}

				
				$(".str").html("game status... "+json.code+ ":"+ json.message);
			}
		});
	}
	var _loginCallback = function(json){
		$(".useragent").html("useragent : "+ ($.gamecloud.userAgent || "undefined")+ "<br>user : "+ _data[0]);
		$("#UbiEmbedPlayer").addClass("loading");

		if(json.code == "0")
			_play();
		else{
			alert('Login failed\n'+json.code+":"+json.message);
			_closeWindow();
		}
			
	}
	var _exitFlag = false;
	var _closeWindow = function(){
		$("#UbiEmbedPlayer").removeClass("loading");
		/*window.open('', '_self', '');
		window.close();
		history.back(-1);*/

		if(!_exitFlag){
			_exitFlag = true;
			$.gamecloud.exitApp();
		}		
	}

	var _autoPurchase = function(){
		$(".str").html("autoPurchase... get "+_gameId+" purchase item list...");

		$.gamecloud.getPurchaseItemList({
			"productIds" : [_gameId],
			"callback" : function(json){
				if(json.code == "0"){
					var _purchaseItems = json.data.purchaseItems || [];
					var _freeItem;
					_purchaseItems.forEach(function(item){
						if(item.itemListPrice.amount === 0)
							_freeItem = item;
					})
					
					if(_freeItem){

						$(".str").html("autoPurchase... purchase "+_gameId+" free item , itemNo : "+_freeItem.itemNo);
						$.gamecloud.purchase({
							itemNo : _freeItem.itemNo,
							callback : function(json){
								if(json.code == "0")
									_play();
								else{
									alert("purchase error! "+json.code+ ":"+ json.message);
									_closeWindow();								
								}
							}						
						})
					}else{
						alert("There is no free item!");
						_closeWindow();
					}					
				}else{
					alert("getPurchaseItemList fail! "+json.code+ ":"+ json.message);
					_closeWindow();					
				}

			}
        });
	}

	$(".useragent").html("useragent : "+ ($.gamecloud.userAgent || "loading... ") );
	$(".str").html("login... id:"+_userId+" ,pwd:"+_userPWD);
	$("#UbiEmbedPlayer").addClass("loading");
	/*
	$.gamecloud.login({
		id : _userId,
		pwd : _userPWD,
		callback : _loginCallback
	})

	window.onkeydown = function (e) {
        var keycode = e.keyCode ? e.keyCode : e.which;
  			if(keycode == 13)
  			  $(".reloadBtn").click();
    }
	*/
});