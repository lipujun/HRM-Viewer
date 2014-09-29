
var SW = {};

(function(SW, options) {
	SW.VERSION = "1.0.0";
	SW.COPYRIGHT = {AUTHOR:"李普军",TELE:'13811969446',EMAIL:'lipujun@aliyun.com',QQ:'44695727'};
	
	SW.APPENDIX = {
		FA:[
			{HEX:'50',ASC:'P',TEXT:'雨量站'},
			{HEX:'48',ASC:'H',TEXT:'河道站'},
			{HEX:'4B',ASC:'K',TEXT:'水库站'},
			{HEX:'5A',ASC:'Z',TEXT:'闸坝站'},
			{HEX:'44',ASC:'D',TEXT:'泵站'},
			{HEX:'54',ASC:'T',TEXT:'潮汐站'},
			{HEX:'4D',ASC:'M',TEXT:'墒情站'},
			{HEX:'47',ASC:'G',TEXT:'地下水'},
			{HEX:'51',ASC:'Q',TEXT:'水质站'},
			{HEX:'49',ASC:'I',TEXT:'取水口'},
			{HEX:'4F',ASC:'O',TEXT:'排水口'}
		],
		FB:[
			{FUNC:'2F',TEXT:'链路维持报'},
			{FUNC:'30',TEXT:'测试报'},
			{FUNC:'31',TEXT:'均匀时段水文信息报'},
			{FUNC:'32',TEXT:'遥测站定时报'},
			{FUNC:'33',TEXT:'遥测站加报报'},
			{FUNC:'34',TEXT:'遥测站小时报'},
			{FUNC:'35',TEXT:'遥测站人工置数报'},
			{FUNC:'36',TEXT:'遥测站图片报'}
		],
		FC:[
			{TAG:'F0',TEXT:'观测时间引导符'},
			{TAG:'F1',TEXT:'测站编码引导符'},
			{TAG:'F2',TEXT:'人工置数'},
			{TAG:'F3',TEXT:'图片信息'},
			{TAG:'F4',TEXT:'1小时内每5分钟时段雨量'},
			{TAG:'F5',TEXT:'1小时内5分钟间隔相对水位1'},
			{TAG:'F6',TEXT:'1小时内5分钟间隔相对水位2'},
			{TAG:'F7',TEXT:'1小时内5分钟间隔相对水位3'},
			{TAG:'F8',TEXT:'1小时内5分钟间隔相对水位4'},
			{TAG:'F9',TEXT:'1小时内5分钟间隔相对水位5'},
			{TAG:'FA',TEXT:'1小时内5分钟间隔相对水位6'},
			{TAG:'FC',TEXT:'1小时内5分钟间隔相对水位7'},
			{TAG:'FD',TEXT:'1小时内5分钟间隔相对水位8'},
			{TAG:'FE',TEXT:'流速批量数据传输'},
			{TAG:'01',TEXT:'断面面积'},
			{TAG:'02',TEXT:'瞬时气温'},
			{TAG:'03',TEXT:'断面面积'},
			{TAG:'04',TEXT:'断面面积'},
			{TAG:'38',TEXT:'电源电压'},
			{TAG:'39',TEXT:'瞬时水位'},
			{TAG:'1F',TEXT:'日降水量'},
			{TAG:'20',TEXT:'当前降水量'},
			{TAG:'21',TEXT:'1分钟时间降水量'},
			{TAG:'26',TEXT:'降雨量累计值'},
			{TAG:'F0',TEXT:'观测时间'},
			{TAG:'F1',TEXT:'测站编码'},
			{TAG:'F4',TEXT:'1小时内每5分钟时段雨量'},
			{TAG:'F5',TEXT:'1分钟时每5分钟相对水位'}
		]
	}
	
	
	SW.DATA_MAP = [
		{TAG:'F0',LEN:5,DEC:1},
		{TAG:'F1',LEN:5,DEC:2},
		{TAG:'F4',LEN:12,DEC:2},
		{TAG:'F5',LEN:24,DEC:2},
		{TAG:'F6',LEN:24,DEC:2},
		{TAG:'F7',LEN:24,DEC:2},
		{TAG:'F8',LEN:24,DEC:2},
		{TAG:'F9',LEN:24,DEC:2},
		{TAG:'FA',LEN:24,DEC:2},
		{TAG:'FB',LEN:24,DEC:2},
		{TAG:'FC',LEN:24,DEC:2}
	]
	
	SW.STRUCT = {
		HEADER : [
			{tag:'SOH',text:'帧起始符',length:2},
			{tag:'CT',text:'中心站地址',length:1},
			{tag:'ST',text:'遥测站地址',length:5},
			{tag:'PWD',text:'密码',length:2},
			{tag:'FUNC',text:'功能码',length:1},
			{tag:'SBL',text:'报文上下行标识及长度',length:2},
			{tag:'STX',text:'报文起始符',length:1},
			{tag:'SYN',text:'包总数及序列号',length:3}
		],
		BODY :{
			SID:{text:'流水号',length:2},
			SND:{text:'发报时间',length:6},
			ST:{text:'遥测站地址',length:5},
			FA:{text:'遥测站分类码',length:1},
			TT:{text:'观测时间',length:5},
			DRX:{text:'时间步长码',length:3}
		},
		EOF : {text:'报文结束符',length:1},
		CRC : {text:'校验码',length:2}
	}
	
	SW.CTL = {
		'SOH':0x7E7E,
		'STX':0x02,
		'SYN':0x16,
		'ETX':0x03,
		'ETB':0x17,
		'ENQ':0x05,
		'EOT':0x04,
		'ACK':0x06,
		'NAK':0x15,
		'ESC':0x1B
	}
	
	SW.RESULT = [];
	
	SW.ORIGI = null;
	
	SW.parser = function(obj) {
		SW.RESULT = [];
		SW.ORIGI = obj;
		var input = obj.value;
		var hexstr = input.replace(/(\s+$)|(^\s+)/g, '');//UpperCase() 转换为大写
		var total = hexstr.length;
		var pos = 0;
		var bodyLen = 8;
		var func = null;
		
		if(!SW.checkLength(hexstr)){
			SW.RESULT.push({text:'数据长度异常，请检查报文！'});
		}
		
		if(!SW.checkEOF(hexstr)){
			SW.RESULT.push({text:'数据无结束符！'});
		}
		
		if(SW.checkCRC(hexstr)){
			SW.RESULT.push({text:'数据CRC校验正确！'});
		}else{
			SW.RESULT.push({text:'数据CRC校验有误！'});
		}
		
		for(var i=0;i<SW.STRUCT.HEADER.length;i++){
			var start = pos;
			var end = pos + SW.STRUCT.HEADER[i].length * 2;
			var substr = hexstr.substring(start,end);
			pos = end;
			SW.RESULT.push({text:'' + SW.STRUCT.HEADER[i].text ,value:''+substr,start:start,end:end});
			//alert(SW.STRUCT.HEADER[i].text + " := " + substr);
			if(i==4){
				func = substr;
			}
			if(i==5){
				bodyLen = parseInt("0x0" + substr.substring(1,4));
			}
			if(i==6 && SW.CTL.STX == parseInt("0x" + substr)){
				break;
			}
		}
		//获取报文长度
		var bodystr = hexstr.substring(pos,pos + bodyLen * 2);
		pos = pos + bodyLen * 2;
		SW.parseBody(func,bodystr);
		
		//获取结束符
		var eofstr = hexstr.substring(pos,pos + SW.STRUCT.EOF.length * 2);
		SW.RESULT.push({text:'' + SW.STRUCT.EOF.text ,value:''+eofstr,start:pos,end:(pos + SW.STRUCT.EOF.length * 2)});
		pos = pos + SW.STRUCT.EOF.length * 2;
		
		//获取校验码
		var crcstr = hexstr.substring(pos,pos + SW.STRUCT.CRC.length * 2);
		SW.RESULT.push({text:'' + SW.STRUCT.CRC.text ,value:''+crcstr,start:pos,end:(pos + SW.STRUCT.CRC.length * 2)});
		pos = pos + SW.STRUCT.CRC.length * 2;
		
		if(pos==total){
			alert('报文解析完成，格式正确！');
		}else{
			alert('报文内容有误，请仔细分析报文体');
		}
	};
	
	/** 解析BODY体*/
	SW.parseBody = function(func,input) {
		var func = '0x' + func;
		switch (parseInt(func)) {
			case 0x2F: 
				SW.parseBody2F(input);
			break;
			case 0x30: 
			case 0x32: 
			case 0x33: 
			case 0x34: 
				SW.parseBody30(input);
				break;
			case 0x31: 
				SW.parseBody31(input);
				break;
			case 0x35: 
				alert('暂不支持人工置数报');
				break;
			case 0x36: 
				alert('暂不支持图片报！');
				break;
		}
	}
		
	SW.parseBody2F  = function(input) {
		var total = input.length;
		var pos = 0;
		var serial = input.substring(pos,pos + SW.STRUCT.BODY.SID.length * 2);
			pos = pos + SW.STRUCT.BODY.SID.length * 2;
		SW.RESULT.push({text:'' + SW.STRUCT.BODY.SID.text ,value:''+serial});
		
		var sndtime = input.substring(pos,pos + SW.STRUCT.BODY.SND.length * 2);
		SW.RESULT.push({text:'' + SW.STRUCT.BODY.SND.text ,value:''+sndtime});
	}
	
	SW.parseBody30  = function(input) {
		var oldpos = SW.RESULT[SW.RESULT.length-1].end;

		var total = input.length;
		var pos = 0;
		var serial = input.substring(pos,pos + SW.STRUCT.BODY.SID.length * 2);
		SW.RESULT.push({text:'' + SW.STRUCT.BODY.SID.text ,value:''+serial,start:oldpos + pos,end:(oldpos + pos + SW.STRUCT.BODY.SID.length * 2)});		
		pos = pos + SW.STRUCT.BODY.SID.length * 2;
		
		var sndtime = input.substring(pos,pos + SW.STRUCT.BODY.SND.length * 2);
		SW.RESULT.push({text:'' + SW.STRUCT.BODY.SND.text ,value:''+sndtime,start:oldpos + pos,end:(oldpos + pos + SW.STRUCT.BODY.SND.length * 2)});		
		pos = pos + SW.STRUCT.BODY.SND.length * 2;
		
		var st = input.substring(pos,pos + 4 + SW.STRUCT.BODY.ST.length * 2);
			SW.RESULT.push({text:'' + SW.STRUCT.BODY.ST.text ,value:''+st,start:oldpos + pos,end:(oldpos + pos + 4 + SW.STRUCT.BODY.ST.length * 2)});
			pos = pos + 4 +  SW.STRUCT.BODY.ST.length * 2;
		
		var fa = input.substring(pos,pos + SW.STRUCT.BODY.FA.length * 2);
			SW.RESULT.push({text:'' + SW.STRUCT.BODY.FA.text ,value:''+fa,start:oldpos + pos,end:(oldpos + pos + SW.STRUCT.BODY.FA.length * 2)});
			pos = pos + SW.STRUCT.BODY.FA.length * 2;
		
		var tt = input.substring(pos,pos + 4 + SW.STRUCT.BODY.TT.length * 2);
			SW.RESULT.push({text:'' + SW.STRUCT.BODY.TT.text ,value:''+tt,start:oldpos + pos,end:(oldpos + pos + 4 + SW.STRUCT.BODY.TT.length * 2)});
			pos = pos + 4 + SW.STRUCT.BODY.TT.length * 2;
		
		while(pos<total){
			//先读两位，再分析出后续应该读出的位数
			var start = pos;
			
			var tmplen = 0;
			var decimal = 0;
			
			var tag = input.substring(pos,pos + 2);
			pos = pos + 2;
			
			var tmpDataLen = SW.parseTag(tag);
			if(tmpDataLen!=0){
				//console.log('tag  len ' + tmpDataLen[0] + ' dec ' + tmpDataLen[1]);
				tmplen = tmpDataLen[0];
				decimal = tmpDataLen[1];
				pos = pos + 2;
			}else{
				var dl = input.substring(pos,pos + 2);
				pos = pos + 2;
				var len2dec = SW.parseDataLength(dl);
				tmplen = len2dec[0];
				decimal = len2dec[1];
				
			}
			
			var datastr = input.substring(pos,pos + tmplen * 2);
			SW.RESULT.push({text:'' + SW.parseFC(tag) ,value:''+datastr,start:oldpos + start,end:(oldpos + pos + tmplen  * 2)});
			
			pos = pos + tmplen * 2;
			var end = pos;
			
		}
	}
	
	SW.parseFC = function(tag){
		tag = tag.toUpperCase();
		for(var i=0;i<SW.APPENDIX.FC.length;i++){
			if(SW.APPENDIX.FC[i].TAG == tag){
				return SW.APPENDIX.FC[i].TEXT;
				break;
			}
		}
		return tag;
	}
	
	SW.parseTag = function(tag){
		for(var i=0;i<SW.DATA_MAP.length;i++){
			if(SW.DATA_MAP[i].TAG == tag){
				return [SW.DATA_MAP[i].LEN,SW.DATA_MAP[i].DEC];
				break;
			}
		}
		return 0;
	}
	
	SW.parseDataLength = function( len2dec) {
	
		var h = parseInt('0x'+len2dec);
			var datalen = h >> 3 & 0x1F;// 获取前五位的数据
			var decimal = h & 0x07; // 获取后三位的小数点位数
		return [datalen,decimal];
	}
	
	SW.parseBody31  = function(input) {
		SW.parseBody30(input);
	}
	
	SW.parseBotyItem = function(input){
		
	}
	
	SW.CRCTABLE =  [ 0x0000, 0xC0C1, 0xC181, 0x0140,
			0xC301, 0x03C0, 0x0280, 0xC241, 0xC601, 0x06C0, 0x0780, 0xC741,
			0x0500, 0xC5C1, 0xC481, 0x0440, 0xCC01, 0x0CC0, 0x0D80, 0xCD41,
			0x0F00, 0xCFC1, 0xCE81, 0x0E40, 0x0A00, 0xCAC1, 0xCB81, 0x0B40,
			0xC901, 0x09C0, 0x0880, 0xC841, 0xD801, 0x18C0, 0x1980, 0xD941,
			0x1B00, 0xDBC1, 0xDA81, 0x1A40, 0x1E00, 0xDEC1, 0xDF81, 0x1F40,
			0xDD01, 0x1DC0, 0x1C80, 0xDC41, 0x1400, 0xD4C1, 0xD581, 0x1540,
			0xD701, 0x17C0, 0x1680, 0xD641, 0xD201, 0x12C0, 0x1380, 0xD341,
			0x1100, 0xD1C1, 0xD081, 0x1040, 0xF001, 0x30C0, 0x3180, 0xF141,
			0x3300, 0xF3C1, 0xF281, 0x3240, 0x3600, 0xF6C1, 0xF781, 0x3740,
			0xF501, 0x35C0, 0x3480, 0xF441, 0x3C00, 0xFCC1, 0xFD81, 0x3D40,
			0xFF01, 0x3FC0, 0x3E80, 0xFE41, 0xFA01, 0x3AC0, 0x3B80, 0xFB41,
			0x3900, 0xF9C1, 0xF881, 0x3840, 0x2800, 0xE8C1, 0xE981, 0x2940,
			0xEB01, 0x2BC0, 0x2A80, 0xEA41, 0xEE01, 0x2EC0, 0x2F80, 0xEF41,
			0x2D00, 0xEDC1, 0xEC81, 0x2C40, 0xE401, 0x24C0, 0x2580, 0xE541,
			0x2700, 0xE7C1, 0xE681, 0x2640, 0x2200, 0xE2C1, 0xE381, 0x2340,
			0xE101, 0x21C0, 0x2080, 0xE041, 0xA001, 0x60C0, 0x6180, 0xA141,
			0x6300, 0xA3C1, 0xA281, 0x6240, 0x6600, 0xA6C1, 0xA781, 0x6740,
			0xA501, 0x65C0, 0x6480, 0xA441, 0x6C00, 0xACC1, 0xAD81, 0x6D40,
			0xAF01, 0x6FC0, 0x6E80, 0xAE41, 0xAA01, 0x6AC0, 0x6B80, 0xAB41,
			0x6900, 0xA9C1, 0xA881, 0x6840, 0x7800, 0xB8C1, 0xB981, 0x7940,
			0xBB01, 0x7BC0, 0x7A80, 0xBA41, 0xBE01, 0x7EC0, 0x7F80, 0xBF41,
			0x7D00, 0xBDC1, 0xBC81, 0x7C40, 0xB401, 0x74C0, 0x7580, 0xB541,
			0x7700, 0xB7C1, 0xB681, 0x7640, 0x7200, 0xB2C1, 0xB381, 0x7340,
			0xB101, 0x71C0, 0x7080, 0xB041, 0x5000, 0x90C1, 0x9181, 0x5140,
			0x9301, 0x53C0, 0x5280, 0x9241, 0x9601, 0x56C0, 0x5780, 0x9741,
			0x5500, 0x95C1, 0x9481, 0x5440, 0x9C01, 0x5CC0, 0x5D80, 0x9D41,
			0x5F00, 0x9FC1, 0x9E81, 0x5E40, 0x5A00, 0x9AC1, 0x9B81, 0x5B40,
			0x9901, 0x59C0, 0x5880, 0x9841, 0x8801, 0x48C0, 0x4980, 0x8941,
			0x4B00, 0x8BC1, 0x8A81, 0x4A40, 0x4E00, 0x8EC1, 0x8F81, 0x4F40,
			0x8D01, 0x4DC0, 0x4C80, 0x8C41, 0x4400, 0x84C1, 0x8581, 0x4540,
			0x8701, 0x47C0, 0x4680, 0x8641, 0x8201, 0x42C0, 0x4380, 0x8341,
			0x4100, 0x81C1, 0x8081, 0x4040 ];
	
	SW.checkCRC = function(hexstr){
		var crc = 0xffff;
		var len = hexstr.length;
		var pos = 0;
		
		var hex = hexstr.substring(0,len-4);
		
		for(i=0;i<(len-4)/2;i++){
			var b = '0x'+hex.substring(pos,pos + 2);
			
			crc = (crc >>> 8) ^ SW.CRCTABLE[(crc ^ b) & 0xff];
			pos = pos + 2;
			
		}
		var result = ''+crc.toString(16);
		var original = hexstr.substring(len-4,len);
		
		while (result.length < 4)
			result = "0" + result;
		
		//console.log('0x'+result + " == " + '0x'+original);
		if(parseInt('0x'+result) == parseInt('0x'+original)){
			return true;
		}else{
			return false;
		}
	}
	
	SW.checkEOF = function(hexstr){
		var len = hexstr.length;
		var eof = hexstr.substring(len-6,len-4);
		if(eof==03 || oef == 05 || eof=='03' || eof=='05'){
			return true;
		}else{
			return false;
		}
	}
	
	SW.checkLength = function(hexstr){
		if(hexstr.length < 34){
			return false;
		}
		return true;
	}

	/**
		定位，根据位置高亮显示
	*/
	SW.position = function(row){
		if(row){
			if(row.cells.length>=4){
				start =row.cells[2].innerHTML;
				end = row.cells[3].innerHTML;
				SW.selectRange(SW.ORIGI, start, end );
			}
		}
	}
	
	SW.selectRange = function(textarea, start, end ){
		// IE
		if(typeof textarea.createTextRange != 'undefined' ){
			var range = textarea.createTextRange();
			// 先把相对起点移动到0处
			range.moveStart( "character", 0)
			range.moveEnd( "character", 0);
			range.collapse( true); // 移动插入光标到start处
			range.moveEnd( "character", end);
			range.moveStart( "character", start);
			range.select();
		}else if ( typeof textarea.setSelectionRange != 'undefined' ){
		　　 textarea.setSelectionRange(start, end);
		　　 textarea.focus();
	　	}
	} 
	
	
})(SW);